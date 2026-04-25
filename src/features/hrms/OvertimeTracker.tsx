import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Loader2,
  
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type {
  CompOffRecordDTO,
  OvertimeRecordDTO,
  OvertimeStatus,
} from "@/services/types/hrms";
import EmptyState from "@/features/hrms/components/EmptyState";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";
import StaffSearchSelect from "@/features/hrms/components/StaffSearchSelect";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";

const OT_STATUS_COLORS: Record<OvertimeStatus, string> = {
  PENDING:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  APPROVED:
    "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  REJECTED:
    "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  INCLUDED_IN_PAYROLL:
    "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  PAID:
    "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
};

interface OtFormState {
  staffRef: string | null;
  date: string;
  hours: string;
  remarks: string;
}

interface ApproveFormState {
  approvedHours: string;
  multiplier: string;
  remarks: string;
}

interface CompOffFormState {
  staffRef: string | null;
  date: string;
  hoursWorked: string;
}

export default function OvertimeTracker() {
  const qc = useQueryClient();
  const { formatCurrency, formatDate } = useHrmsFormatters();

  const [otFormOpen, setOtFormOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<OvertimeRecordDTO | null>(null);
  const [rejectTarget, setRejectTarget] = useState<OvertimeRecordDTO | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [compOffOpen, setCompOffOpen] = useState(false);
  const [otForm, setOtForm] = useState<OtFormState>({
    staffRef: null,
    date: new Date().toISOString().substring(0, 10),
    hours: "",
    remarks: "",
  });
  const [approveForm, setApproveForm] = useState<ApproveFormState>({
    approvedHours: "",
    multiplier: "1.50",
    remarks: "",
  });
  const [compOffForm, setCompOffForm] = useState<CompOffFormState>({
    staffRef: null,
    date: new Date().toISOString().substring(0, 10),
    hoursWorked: "",
  });

  const { data: overtime = [], isLoading: loadingOt } = useQuery({
    queryKey: ["hrms", "overtime"],
    queryFn: () => hrmsService.listOvertime().then((r) => r.data),
  });

  const { data: compOff = [], isLoading: loadingCompOff } = useQuery({
    queryKey: ["hrms", "comp-off"],
    queryFn: () => hrmsService.listCompOff("all").then((r) => r.data),
  });

  const createOtMutation = useMutation({
    mutationFn: () => {
      if (!otForm.staffRef || !otForm.hours)
        throw new Error("Staff and hours are required.");
      return hrmsService.createOvertime({
        staffRef: otForm.staffRef,
        workDate: otForm.date,
        hoursWorked: parseFloat(otForm.hours),
        reason: otForm.remarks || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Overtime record created");
      qc.invalidateQueries({ queryKey: ["hrms", "overtime"] });
      setOtFormOpen(false);
      setOtForm({ staffRef: null, date: new Date().toISOString().substring(0, 10), hours: "", remarks: "" });
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const approveOtMutation = useMutation({
    mutationFn: (otId: string) => hrmsService.approveOvertime(otId, { multiplier: parseFloat(approveForm.multiplier) }),
    onSuccess: () => {
      toast.success("Overtime approved");
      qc.invalidateQueries({ queryKey: ["hrms", "overtime"] });
      setApproveTarget(null);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const rejectOtMutation = useMutation({
    mutationFn: (otId: string) => hrmsService.rejectOvertime(otId, rejectRemarks),
    onSuccess: () => {
      toast.success("Overtime rejected");
      qc.invalidateQueries({ queryKey: ["hrms", "overtime"] });
      setRejectTarget(null);
      setRejectRemarks("");
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const createCompOffMutation = useMutation({
    mutationFn: () => {
      if (!compOffForm.staffRef || !compOffForm.hoursWorked)
        throw new Error("Staff and hours are required.");
      return hrmsService.createCompOff({
        staffRef: compOffForm.staffRef ?? "",
        creditDate: compOffForm.date,
      });
    },
    onSuccess: () => {
      toast.success("Comp-off record created");
      qc.invalidateQueries({ queryKey: ["hrms", "comp-off"] });
      setCompOffOpen(false);
      setCompOffForm({ staffRef: null, date: new Date().toISOString().substring(0, 10), hoursWorked: "" });
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              ⏱️
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Overtime &amp; Comp-Off</h2>
              <p className="text-sm text-white/70">Track and approve overtime hours and compensatory-off credits</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCompOffOpen(true)}
              className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm gap-1.5"
            >
              🔄 Add Comp-Off
            </Button>
            <Button
              onClick={() => setOtFormOpen(true)}
              className="bg-white text-amber-700 hover:bg-white/90 font-semibold gap-1.5 shadow-sm"
            >
              ➕ Record Overtime
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overtime">
        <TabsList>
          <TabsTrigger value="overtime">Overtime</TabsTrigger>
          <TabsTrigger value="compoff">Comp-Off</TabsTrigger>
        </TabsList>

        {/* ── Overtime ── */}
        <TabsContent value="overtime" className="mt-4 space-y-3">
          {loadingOt ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : overtime.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No overtime records"
              description="Record overtime worked by staff members."
              actionLabel="Record Overtime"
              onAction={() => setOtFormOpen(true)}
            />
          ) : (
            overtime.map((ot: OvertimeRecordDTO) => (
              <Card key={ot.uuid}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{ot.staffName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(ot.workDate)} · {ot.hoursWorked}h worked
                      {ot.approvedAt != null && ` · approved`}
                    </p>
                    {ot.compensationType === "CASH" && (ot.status === "APPROVED" || ot.status === "PAID" || ot.status === "INCLUDED_IN_PAYROLL") && (
                      <p className="text-xs font-semibold text-primary mt-1">
                        Payout: {ot.approvedAmount ? formatCurrency(ot.approvedAmount) : "Pending"} <span className="text-muted-foreground font-normal">(Rate: {ot.multiplier}x)</span>
                      </p>
                    )}
                    {ot.reason && (
                      <p className="text-xs text-muted-foreground italic mt-1">{ot.reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={OT_STATUS_COLORS[ot.status]}>
                      {ot.status.replace("_", " ")}
                    </Badge>
                    {ot.status === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-green-300 text-green-700 hover:bg-green-50"
                          onClick={() => {
                            setApproveTarget(ot);
                            setApproveForm({
                              approvedHours: String(ot.hoursWorked),
                              multiplier: "1.50",
                              remarks: "",
                            });
                          }}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setRejectTarget(ot);
                            setRejectRemarks("");
                          }}
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── Comp-Off ── */}
        <TabsContent value="compoff" className="mt-4 space-y-3">
          {loadingCompOff ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : compOff.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No comp-off records"
              description="Compensatory-off credits will appear here."
              actionLabel="Add Comp-Off"
              onAction={() => setCompOffOpen(true)}
            />
          ) : (
            compOff.map((co: CompOffRecordDTO) => (
              <Card key={co.uuid}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{co.staffName}</p>
                    <p className="text-xs text-muted-foreground">
                      Credit date: {formatDate(co.creditDate)}
                      {co.expiryDate && ` · Expires: ${formatDate(co.expiryDate)}`}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      co.credited
                        ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                    }
                  >
                    {co.credited ? "CREDITED" : "PENDING"}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Record Overtime Dialog */}
      <Dialog open={otFormOpen} onOpenChange={setOtFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Overtime</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <StaffSearchSelect
              value={otForm.staffRef}
              onChange={(uuid) => setOtForm((p) => ({ ...p, staffRef: uuid }))}
              label="Staff Member"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={otForm.date}
                  onChange={(e) => setOtForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hours <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={otForm.hours}
                  onChange={(e) => setOtForm((p) => ({ ...p, hours: e.target.value }))}
                  placeholder="e.g. 2.5"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Input
                value={otForm.remarks}
                onChange={(e) => setOtForm((p) => ({ ...p, remarks: e.target.value }))}
                placeholder="Optional reason / context..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOtFormOpen(false)}>Cancel</Button>
            <Button
              disabled={createOtMutation.isPending || !otForm.staffRef || !otForm.hours}
              onClick={() => createOtMutation.mutate()}
            >
              {createOtMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Overtime Dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Overtime</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {approveTarget?.staffName} · {formatDate(approveTarget?.workDate)} ·{" "}
              {approveTarget?.hoursWorked}h worked
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Approved Hours <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={approveForm.approvedHours}
                  onChange={(e) => setApproveForm((p) => ({ ...p, approvedHours: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rate Multiplier <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min={1}
                  step={0.1}
                  value={approveForm.multiplier}
                  onChange={(e) => setApproveForm((p) => ({ ...p, multiplier: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Input
                value={approveForm.remarks}
                onChange={(e) => setApproveForm((p) => ({ ...p, remarks: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button
              disabled={
                approveOtMutation.isPending ||
                !approveForm.approvedHours ||
                !approveForm.multiplier
              }
              onClick={() => approveTarget && approveOtMutation.mutate(approveTarget.uuid)}
            >
              {approveOtMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject OT Confirm */}
      <ReviewDialog
        open={!!rejectTarget}
        onOpenChange={(o) => !o && setRejectTarget(null)}
        title="Reject Overtime"
        description={`Reject overtime for ${rejectTarget?.staffName} on ${formatDate(rejectTarget?.workDate)}?`}
        severity="danger"
        confirmLabel="Reject"
        onConfirm={() => {
          if (!rejectRemarks.trim()) {
            toast.error("Rejection reason is required.");
            return;
          }
          rejectTarget && rejectOtMutation.mutate(rejectTarget.uuid);
        }}
        isPending={rejectOtMutation.isPending}
      >
        <div className="space-y-1.5">
          <Label>Reason <span className="text-destructive">*</span></Label>
          <Textarea
            value={rejectRemarks}
            onChange={(e) => setRejectRemarks(e.target.value)}
            rows={2}
          />
        </div>
      </ReviewDialog>

      {/* Comp-Off Dialog */}
      <Dialog open={compOffOpen} onOpenChange={setCompOffOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comp-Off Credit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <StaffSearchSelect
              value={compOffForm.staffRef}
              onChange={(uuid) => setCompOffForm((p) => ({ ...p, staffRef: uuid }))}
              label="Staff Member"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date Worked</Label>
                <Input
                  type="date"
                  value={compOffForm.date}
                  onChange={(e) => setCompOffForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hours Worked <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={compOffForm.hoursWorked}
                  onChange={(e) => setCompOffForm((p) => ({ ...p, hoursWorked: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompOffOpen(false)}>Cancel</Button>
            <Button
              disabled={
                createCompOffMutation.isPending ||
                !compOffForm.staffRef ||
                !compOffForm.hoursWorked
              }
              onClick={() => createCompOffMutation.mutate()}
            >
              {createCompOffMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Comp-Off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
