import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import DataTable, { type Column } from "@/components/common/DataTable";
import StaffSearchSelect from "@/features/hrms/components/StaffSearchSelect";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";

import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type {
   PromotionCreateDTO,
   PromotionResponseDTO,
   PromotionReviewDTO,
   SalaryTemplateResponseDTO,
   StaffDesignationResponseDTO,
   StaffGradeResponseDTO,
} from "@/services/types/hrms";

export default function PromotionManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");

  // New Promotion State
  const [staffRef, setStaffRef] = useState<string>("");
  const [proposedDesignationRef, setProposedDesignationRef] = useState<string>("");
  const [proposedGradeRef, setProposedGradeRef] = useState<string>("none");
  const [newSalaryTemplateRef, setNewSalaryTemplateRef] = useState<string>("none");
  const [effectiveDate, setEffectiveDate] = useState<string>("");
  const [orderReference, setOrderReference] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  // Review State
  const [reviewTarget, setReviewTarget] = useState<PromotionResponseDTO | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");

  // Queries
  const { data: pendingPromotions = [], isLoading: pendingLoading } = useQuery({
    queryKey: ["hrms", "promotions", "pending"],
    queryFn: () => hrmsService.listPromotions({ status: "PENDING" }).then(res => res.data.content),
  });

  const { data: historyPromotions = [], isLoading: historyLoading } = useQuery({
    queryKey: ["hrms", "promotions", "history"],
    queryFn: () => Promise.all([
       hrmsService.listPromotions({ status: "APPROVED" }).then(res => res.data.content),
       hrmsService.listPromotions({ status: "REJECTED" }).then(res => res.data.content)
    ]).then(([approved, rejected]) => [...approved, ...rejected].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())),
  });

  const { data: designations = [] } = useQuery({
    queryKey: ["hrms", "designations"],
      queryFn: () => hrmsService.listDesignations().then(res => res.data),
  });

  const { data: grades = [] } = useQuery({
    queryKey: ["hrms", "staff-grades"],
      queryFn: () => hrmsService.listGrades().then(res => res.data),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["hrms", "salary-templates"],
      queryFn: () => hrmsService.listSalaryTemplates().then(res => res.data),
  });

  // Mutations
  const initiateMutation = useMutation({
    mutationFn: (payload: PromotionCreateDTO) => hrmsService.initiatePromotion(payload),
    onSuccess: () => {
      toast.success("Promotion initiated and pending approval");
      setStaffRef("");
      setProposedDesignationRef("");
      setProposedGradeRef("none");
      setNewSalaryTemplateRef("none");
      setEffectiveDate("");
      setOrderReference("");
      setRemarks("");
      setActiveTab("pending");
      queryClient.invalidateQueries({ queryKey: ["hrms", "promotions"] });
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const reviewMutation = useMutation({
    mutationFn: () => {
       const payload: PromotionReviewDTO = { remarks: reviewRemarks };
       if (reviewAction === "approve") return hrmsService.approvePromotion(reviewTarget!.uuid, payload);
       return hrmsService.rejectPromotion(reviewTarget!.uuid, payload);
    },
    onSuccess: () => {
      toast.success(`Promotion ${reviewAction === "approve" ? "approved" : "rejected"} successfully`);
      setReviewTarget(null);
      setReviewAction(null);
      setReviewRemarks("");
      queryClient.invalidateQueries({ queryKey: ["hrms", "promotions"] });
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const handleInitiate = () => {
     if (!staffRef || !proposedDesignationRef || !effectiveDate) {
        return toast.error("Please fill all required fields");
     }
     initiateMutation.mutate({
        staffRef,
        proposedDesignationRef,
        effectiveDate,
        proposedGradeRef: proposedGradeRef === "none" ? undefined : proposedGradeRef,
        newSalaryTemplateRef: newSalaryTemplateRef === "none" ? undefined : newSalaryTemplateRef,
        orderReference: orderReference || undefined,
        remarks: remarks || undefined,
     });
  };

  const pendingColumns = useMemo<Column<PromotionResponseDTO>[]>(() => [
    { key: "staffName", header: "Staff Member", searchable: true, render: row => <div className="font-medium">{row.staffName} <span className="text-xs text-muted-foreground ml-1">({row.employeeId})</span></div> },
    { key: "currentDesignationName", header: "Current Role", render: row => <Badge variant="outline">{row.currentDesignationName}</Badge> },
    { key: "proposedDesignationName", header: "Proposed Role", render: row => <Badge variant="default" className="bg-green-600 hover:bg-green-700">{row.proposedDesignationName}</Badge> },
    { key: "effectiveDate", header: "Effective Date", render: row => format(new Date(row.effectiveDate), "PP") },
    { key: "status", header: "Actions", render: row => (
        <div className="flex gap-2">
           <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => { setReviewTarget(row); setReviewAction("approve"); }}>
              <Check className="w-4 h-4 mr-1" /> Approve
           </Button>
           <Button size="sm" variant="outline" className="text-destructive border-red-200 hover:bg-destructive/10" onClick={() => { setReviewTarget(row); setReviewAction("reject"); }}>
              <X className="w-4 h-4 mr-1" /> Reject
           </Button>
        </div>
    )}
  ], []);

  const historyColumns = useMemo<Column<PromotionResponseDTO>[]>(() => [
    { key: "staffName", header: "Staff Member", searchable: true, render: row => <div className="font-medium">{row.staffName} <span className="text-xs text-muted-foreground ml-1">({row.employeeId})</span></div> },
    { key: "proposedDesignationName", header: "Promoted To", render: row => <span className="font-medium">{row.proposedDesignationName}</span> },
    { key: "effectiveDate", header: "Effective Date", render: row => format(new Date(row.effectiveDate), "PP") },
    { key: "status", header: "Status", render: row => (
        <Badge variant={row.status === "APPROVED" ? "default" : "destructive"}>
           {row.status}
        </Badge>
    ) },
    { key: "approvedByName", header: "Reviewed By", render: row => row.approvedByName || "-" },
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Promotions & Transfers</h2>
        <p className="text-muted-foreground text-sm">
          Initiate, approve, or reject staff promotions and inter-departmental transfers.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="initiate">Initiate Promotion</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="m-0">
          <DataTable
            columns={pendingColumns}
            data={pendingPromotions}
            getRowId={(row) => row.uuid}
            emptyMessage={pendingLoading ? "Loading..." : "No pending promotion requests."}
          />
        </TabsContent>

        <TabsContent value="history" className="m-0">
          <DataTable
            columns={historyColumns}
            data={historyPromotions}
            getRowId={(row) => row.uuid}
            emptyMessage={historyLoading ? "Loading..." : "No past promotions recorded."}
          />
        </TabsContent>

        <TabsContent value="initiate" className="m-0">
          <Card className="max-w-2xl">
             <CardHeader>
                <CardTitle>Initiate New Promotion</CardTitle>
                <CardDescription>
                  Start a promotion workflow. Once initiated, an admin must approve it before it takes effect.
                </CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
                <div className="space-y-2">
                   <Label>Target Staff Member <span className="text-destructive">*</span></Label>
                   <StaffSearchSelect
                      value={staffRef || null}
                      onChange={(uuid) => setStaffRef(uuid ?? "")}
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label>Proposed Designation <span className="text-destructive">*</span></Label>
                      <Select value={proposedDesignationRef} onValueChange={setProposedDesignationRef}>
                         <SelectTrigger><SelectValue placeholder="Select Designation" /></SelectTrigger>
                         <SelectContent>
                            {designations.map((d: StaffDesignationResponseDTO) => <SelectItem key={d.uuid} value={d.uuid}>{d.designationName}</SelectItem>)}
                         </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">If designation has default salary/grades, they will auto-apply.</p>
                   </div>
                   <div className="space-y-2">
                      <Label>Effective Date <span className="text-destructive">*</span></Label>
                      <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label>Override Grade (Optional)</Label>
                      <Select value={proposedGradeRef} onValueChange={setProposedGradeRef}>
                         <SelectTrigger><SelectValue placeholder="No Override" /></SelectTrigger>
                         <SelectContent>
                            <SelectItem value="none">Use Designation Default / Keep Current</SelectItem>
                            {grades.map((g: StaffGradeResponseDTO) => <SelectItem key={g.uuid} value={g.uuid}>{g.gradeCode}</SelectItem>)}
                         </SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-2">
                      <Label>Override Salary Template (Optional)</Label>
                      <Select value={newSalaryTemplateRef} onValueChange={setNewSalaryTemplateRef}>
                         <SelectTrigger><SelectValue placeholder="No Override" /></SelectTrigger>
                         <SelectContent>
                            <SelectItem value="none">Use Designation Default / Keep Current</SelectItem>
                            {templates.map((t: SalaryTemplateResponseDTO) => <SelectItem key={t.uuid} value={t.uuid}>{t.templateName}</SelectItem>)}
                         </SelectContent>
                      </Select>
                   </div>
                </div>

                <div className="space-y-2">
                   <Label>Internal Order Reference (Optional)</Label>
                   <Input value={orderReference} onChange={e => setOrderReference(e.target.value)} placeholder="e.g., HR-PRM-2026-001" />
                </div>

                <div className="space-y-2">
                   <Label>Remarks/Justification</Label>
                   <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Provide context for this promotion..." />
                </div>

                <Button 
                   className="w-full mt-4" 
                   disabled={!staffRef || !proposedDesignationRef || !effectiveDate || initiateMutation.isPending}
                   onClick={handleInitiate}
                >
                   {initiateMutation.isPending ? "Submitting..." : "Submit Promotion for Review"}
                </Button>
             </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ReviewDialog
        open={Boolean(reviewTarget)}
        onOpenChange={(o) => { if (!o) setReviewTarget(null); }}
        title={reviewAction === "approve" ? "Approve Promotion" : "Reject Promotion"}
        description={
           reviewAction === "approve" 
              ? `This will update ${reviewTarget?.staffName}'s designation and compensation immediately (or scheduled on effective date).`
              : `This will cancel the promotion request for ${reviewTarget?.staffName}.`
        }
      severity={reviewAction === "approve" ? "warning" : "danger"}
        confirmLabel={reviewAction === "approve" ? "Approve" : "Reject"}
        isPending={reviewMutation.isPending}
        requireCheckbox
        checkboxLabel="I have reviewed the details and authorize this action."
        onConfirm={() => reviewMutation.mutate()}
      >
        <div className="space-y-4">
           {reviewTarget && (
              <div className="rounded-md bg-muted p-3 text-sm flex flex-col gap-2">
                <div className="flex justify-between border-b pb-2">
                   <span className="text-muted-foreground">Staff Member</span>
                   <span className="font-medium">{reviewTarget.staffName} ({reviewTarget.employeeId})</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                   <span className="text-muted-foreground">Promotion</span>
                   <span className="font-medium">{reviewTarget.currentDesignationName} → {reviewTarget.proposedDesignationName}</span>
                </div>
                <div className="flex justify-between">
                   <span className="text-muted-foreground">Effective Date</span>
                   <span className="font-medium">{format(new Date(reviewTarget.effectiveDate), "PP")}</span>
                </div>
              </div>
           )}

           <div className="space-y-2">
              <Label>Approval/Rejection Remarks (Required for Rejection)</Label>
              <Textarea 
                 value={reviewRemarks} 
                 onChange={e => setReviewRemarks(e.target.value)}
                 placeholder="Will be appended to the history audit trail..."
              />
           </div>
        </div>
      </ReviewDialog>
    </div>
  );
}
