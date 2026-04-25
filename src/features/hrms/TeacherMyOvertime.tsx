import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, Loader2, } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/features/hrms/components/EmptyState";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type { OvertimeStatus } from "@/services/types/hrms";

const STATUS_COLORS: Record<OvertimeStatus, string> = {
  PENDING: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  INCLUDED_IN_PAYROLL: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  PAID: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
};

export default function TeacherMyOvertime() {
  const qc = useQueryClient();
  const { formatDate, formatCurrency } = useHrmsFormatters();
  const [open, setOpen] = useState(false);
  const [workDate, setWorkDate] = useState(new Date().toISOString().substring(0, 10));
  const [hoursWorked, setHoursWorked] = useState("");
  const [reason, setReason] = useState("");
  const [compensationType, setCompensationType] = useState("CASH");

  const { data: overtime = [], isLoading } = useQuery({
    queryKey: ["hrms", "self", "overtime"],
    queryFn: () => hrmsService.listMyOvertime().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!hoursWorked) {
        throw new Error("Hours worked is required.");
      }
      return hrmsService.createMyOvertime({
        workDate,
        hoursWorked: parseFloat(hoursWorked),
        reason: reason || undefined,
        compensationType,
      });
    },
    onSuccess: () => {
      toast.success("Overtime request submitted");
      qc.invalidateQueries({ queryKey: ["hrms", "self", "overtime"] });
      setOpen(false);
      setHoursWorked("");
      setReason("");
      setCompensationType("CASH");
      setWorkDate(new Date().toISOString().substring(0, 10));
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  return (
    <div className="space-y-4">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              ⏱️
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">My Overtime</h2>
              <p className="text-sm text-white/70">Submit and track overtime hours for approval</p>
            </div>
          </div>
          <Button
            onClick={() => setOpen(true)}
            className="bg-white text-amber-700 hover:bg-white/90 font-semibold gap-1.5 shadow-sm"
          >
            ➕ Add Overtime
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : overtime.length === 0 ? (
        <EmptyState icon={Clock} title="No overtime records" description="Submit overtime hours for approval." />
      ) : (
        <div className="space-y-3">
          {overtime.map((record) => (
            <Card key={record.uuid}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{formatDate(record.workDate)} · {record.hoursWorked}h</CardTitle>
                    <p className="text-xs text-muted-foreground">{record.compensationType ?? "CASH"}</p>
                  </div>
                  <Badge variant="secondary" className={STATUS_COLORS[record.status]}>{record.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                {record.compensationType === "CASH" && (record.status === "APPROVED" || record.status === "INCLUDED_IN_PAYROLL" || record.status === "PAID") && (
                  <p className="text-xs font-semibold text-primary mb-1">
                    Payout: {record.approvedAmount ? formatCurrency(record.approvedAmount) : "Pending"} <span className="text-muted-foreground font-normal">(Rate: {record.multiplier}x)</span>
                  </p>
                )}
                {record.reason && (
                  <p className="text-xs text-muted-foreground italic">{record.reason}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Overtime</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Work Date</Label>
                <Input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Hours <span className="text-destructive">*</span></Label>
                <Input type="number" min={0.5} step={0.5} value={hoursWorked} onChange={(e) => setHoursWorked(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Compensation Type</Label>
              <Select value={compensationType} onValueChange={setCompensationType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="COMP_OFF">Comp-Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
