import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Loader2,
  LogOut,
  Plus,
  Shield,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type {
  ExitClearanceItemDTO,
  ExitRequestDTO,
  ExitRequestStatus,
  FnFCreateDTO,
  FnFStatus,
  FullFinalSettlementDTO,
} from "@/services/types/hrms";
import EmptyState from "@/features/hrms/components/EmptyState";
import StaffSearchSelect from "@/features/hrms/components/StaffSearchSelect";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";

// ── Status config ─────────────────────────────────────────────────────

const EXIT_STATUS_CONFIG: Record<
  ExitRequestStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  SUBMITTED: {
    label: "Submitted",
    color: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: <Clock className="h-3 w-3" />,
  },
  NOTICE_PERIOD: {
    label: "Notice Period",
    color: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  CLEARANCE: {
    label: "Clearance",
    color: "bg-violet-50 text-violet-700 border border-violet-200",
    icon: <Shield className="h-3 w-3" />,
  },
  FNF_PROCESSING: {
    label: "FnF Processing",
    color: "bg-orange-50 text-orange-700 border border-orange-200",
    icon: <DollarSign className="h-3 w-3" />,
  },
  COMPLETED: {
    label: "Completed",
    color: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  WITHDRAWN: {
    label: "Withdrawn",
    color: "bg-gray-50 text-gray-600 border border-gray-200",
    icon: <XCircle className="h-3 w-3" />,
  },
};

const FNF_STATUS_COLORS: Record<FnFStatus, string> = {
  DRAFT: "bg-slate-50 text-slate-700 border border-slate-200",
  APPROVED: "bg-blue-50 text-blue-700 border border-blue-200",
  DISBURSED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

const STATUS_SEQUENCE: ExitRequestStatus[] = [
  "SUBMITTED",
  "NOTICE_PERIOD",
  "CLEARANCE",
  "FNF_PROCESSING",
  "COMPLETED",
];

// ── Form state ────────────────────────────────────────────────────────

interface ExitFormState {
  staffRef: string | null;
  resignationDate: string;
  lastWorkingDate: string;
  exitReason: string;
}

const initForm = (): ExitFormState => ({
  staffRef: null,
  resignationDate: new Date().toISOString().substring(0, 10),
  lastWorkingDate: "",
  exitReason: "",
});

// ── FnF form ──────────────────────────────────────────────────────────

interface FnFFormState {
  grossSalaryDue: string;
  deductions: string;
  leaveEncashment: string;
  gratuity: string;
  otherAdditions: string;
  otherDeductions: string;
  remarks: string;
}

const initFnFForm = (): FnFFormState => ({
  grossSalaryDue: "",
  deductions: "",
  leaveEncashment: "0",
  gratuity: "0",
  otherAdditions: "0",
  otherDeductions: "0",
  remarks: "",
});

// ── ClearancePanel ────────────────────────────────────────────────────

function ClearancePanel({ exitId }: { exitId: string }) {
  const { formatDate } = useHrmsFormatters();
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["hrms", "exit", exitId, "clearance"],
    queryFn: () => hrmsService.listClearanceItems(exitId).then((r) => r.data),
  });

  // Backend expects numeric Long id, not UUID
  const clearMutation = useMutation({
    mutationFn: (itemId: number) => hrmsService.clearItem(exitId, itemId),
    onSuccess: () => {
      toast.success("Item cleared");
      qc.invalidateQueries({ queryKey: ["hrms", "exit", exitId, "clearance"] });
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const waiveMutation = useMutation({
    mutationFn: (itemId: number) => hrmsService.waiveItem(exitId, itemId),
    onSuccess: () => {
      toast.success("Item waived");
      qc.invalidateQueries({ queryKey: ["hrms", "exit", exitId, "clearance"] });
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  if (isLoading)
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );

  const cleared = items.filter((i) => !!i.completedAt || i.waived).length;
  const pct = Math.round((cleared / Math.max(items.length, 1)) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-muted-foreground">Clearance Progress</span>
        <span className="font-semibold text-primary">{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
      <p className="text-xs text-muted-foreground">
        {cleared} of {items.length} items cleared
      </p>
      {items.length === 0 && (
        <p className="py-3 text-center text-sm text-muted-foreground">
          No clearance items found.
        </p>
      )}
      <div className="space-y-2">
        {items.map((item: ExitClearanceItemDTO) => {
          const isDone = !!item.completedAt || item.waived;
          return (
            <div
              key={item.id}
              className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                isDone ? "bg-muted/30" : "bg-white dark:bg-card"
              }`}
            >
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{item.itemType.replace(/_/g, " ")}</p>
                <div className="flex items-center gap-1.5">
                  {item.waived ? (
                    <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-[10px] px-1.5 py-0">Waived</Badge>
                  ) : item.completedAt ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] px-1.5 py-0">Cleared</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-600 border border-gray-200 text-[10px] px-1.5 py-0">Pending</Badge>
                  )}
                  {item.completedByName && (
                    <span className="text-xs text-muted-foreground">
                      by {item.completedByName}{item.completedAt ? ` · ${formatDate(item.completedAt)}` : ""}
                    </span>
                  )}
                  {item.waived && item.waivedBy && (
                    <span className="text-xs text-muted-foreground">
                      by {item.waivedBy}{item.waivedAt ? ` · ${formatDate(item.waivedAt)}` : ""}
                    </span>
                  )}
                </div>
              </div>
              {!isDone && (
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs"
                    onClick={() => clearMutation.mutate(item.id)}
                    disabled={clearMutation.isPending}
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground hover:text-amber-700"
                    onClick={() => waiveMutation.mutate(item.id)}
                    disabled={waiveMutation.isPending}
                  >
                    Waive
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── FnFPanel ──────────────────────────────────────────────────────────

function FnFRow({ label, value, valueClass = "" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}

function FnFPanel({ exit }: { exit: ExitRequestDTO }) {
  const { formatCurrency } = useHrmsFormatters();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [fnfForm, setFnfForm] = useState<FnFFormState>(initFnFForm());

  const { data: fnf, isLoading } = useQuery({
    queryKey: ["hrms", "exit", exit.uuid, "fnf"],
    queryFn: () => hrmsService.getFnF(exit.uuid).then((r) => r.data),
    retry: (_, err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status;
      return status !== 404;
    },
  });

  const createFnFMutation = useMutation({
    mutationFn: (payload: FnFCreateDTO) => hrmsService.createFnF(exit.uuid, payload),
    onSuccess: () => {
      toast.success("Full & Final settlement created");
      qc.invalidateQueries({ queryKey: ["hrms", "exit", exit.uuid, "fnf"] });
      setCreateOpen(false);
      setFnfForm(initFnFForm());
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const approveMutation = useMutation({
    mutationFn: () => hrmsService.approveFnF(exit.uuid),
    onSuccess: () => {
      toast.success("FnF approved");
      qc.invalidateQueries({ queryKey: ["hrms", "exit", exit.uuid, "fnf"] });
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const disburseMutation = useMutation({
    mutationFn: () => hrmsService.disburseFnF(exit.uuid),
    onSuccess: () => {
      toast.success("FnF disbursed");
      qc.invalidateQueries({ queryKey: ["hrms", "exit"] });
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const handleSubmitFnF = () => {
    const toNum = (v: string) => parseFloat(v) || 0;
    createFnFMutation.mutate({
      grossSalaryDue: toNum(fnfForm.grossSalaryDue),
      deductions: toNum(fnfForm.deductions),
      leaveEncashment: toNum(fnfForm.leaveEncashment),
      gratuity: toNum(fnfForm.gratuity),
      otherAdditions: toNum(fnfForm.otherAdditions),
      otherDeductions: toNum(fnfForm.otherDeductions),
      remarks: fnfForm.remarks || undefined,
    });
  };

  if (isLoading)
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );

  if (!fnf)
    return (
      <>
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-8">
          <div className="rounded-full bg-primary/10 p-3">
            <DollarSign className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-medium">No settlement created yet</p>
            <p className="text-sm text-muted-foreground">
              Create a Full &amp; Final settlement to calculate the net payable amount.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create FnF Settlement
          </Button>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Full &amp; Final Settlement</DialogTitle>
              <DialogDescription>
                Enter financial details for {exit.staffName}'s settlement.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Gross Salary Due <span className="text-destructive">*</span></Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00"
                    value={fnfForm.grossSalaryDue}
                    onChange={(e) => setFnfForm((p) => ({ ...p, grossSalaryDue: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Deductions</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00"
                    value={fnfForm.deductions}
                    onChange={(e) => setFnfForm((p) => ({ ...p, deductions: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Leave Encashment</Label>
                  <Input type="number" min="0" step="0.01"
                    value={fnfForm.leaveEncashment}
                    onChange={(e) => setFnfForm((p) => ({ ...p, leaveEncashment: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Gratuity</Label>
                  <Input type="number" min="0" step="0.01"
                    value={fnfForm.gratuity}
                    onChange={(e) => setFnfForm((p) => ({ ...p, gratuity: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Other Additions</Label>
                  <Input type="number" min="0" step="0.01"
                    value={fnfForm.otherAdditions}
                    onChange={(e) => setFnfForm((p) => ({ ...p, otherAdditions: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Other Deductions</Label>
                  <Input type="number" min="0" step="0.01"
                    value={fnfForm.otherDeductions}
                    onChange={(e) => setFnfForm((p) => ({ ...p, otherDeductions: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Remarks</Label>
                <Textarea placeholder="Optional notes..." rows={2}
                  value={fnfForm.remarks}
                  onChange={(e) => setFnfForm((p) => ({ ...p, remarks: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmitFnF} disabled={!fnfForm.grossSalaryDue || createFnFMutation.isPending}>
                {createFnFMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Settlement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );

  const settlement = fnf as FullFinalSettlementDTO;
  const toNum = (v: number | undefined) => v ?? 0;
  const totalEarnings = toNum(settlement.grossSalaryDue) + toNum(settlement.leaveEncashment) + toNum(settlement.gratuity) + toNum(settlement.otherAdditions);
  const totalDeductions = toNum(settlement.deductions) + toNum(settlement.otherDeductions);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge className={FNF_STATUS_COLORS[settlement.status]}>FnF: {settlement.status}</Badge>
        <div className="flex gap-2">
          {settlement.status === "DRAFT" && (
            <Button size="sm" onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
              {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve FnF
            </Button>
          )}
          {settlement.status === "APPROVED" && (
            <Button size="sm" onClick={() => disburseMutation.mutate()} disabled={disburseMutation.isPending}>
              {disburseMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark Disbursed
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-emerald-50/50 p-3 space-y-2">
          <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Earnings</p>
          <FnFRow label="Gross Salary Due" value={formatCurrency(toNum(settlement.grossSalaryDue))} />
          <FnFRow label="Leave Encashment" value={formatCurrency(toNum(settlement.leaveEncashment))} />
          <FnFRow label="Gratuity" value={formatCurrency(toNum(settlement.gratuity))} />
          {toNum(settlement.otherAdditions) > 0 && (
            <FnFRow label="Other Additions" value={formatCurrency(toNum(settlement.otherAdditions))} />
          )}
          <Separator className="my-1" />
          <div className="flex justify-between text-sm font-semibold text-emerald-800">
            <span>Total Earnings</span>
            <span>{formatCurrency(totalEarnings)}</span>
          </div>
        </div>
        <div className="rounded-lg border bg-red-50/50 p-3 space-y-2">
          <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wide">Deductions</p>
          <FnFRow label="Deductions" value={`-${formatCurrency(toNum(settlement.deductions))}`} valueClass="text-red-600" />
          {toNum(settlement.otherDeductions) > 0 && (
            <FnFRow label="Other Deductions" value={`-${formatCurrency(toNum(settlement.otherDeductions))}`} valueClass="text-red-600" />
          )}
          <Separator className="my-1" />
          <div className="flex justify-between text-sm font-semibold text-red-800">
            <span>Total Deductions</span>
            <span>-{formatCurrency(totalDeductions)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Net Payable</p>
          {settlement.remarks && <p className="text-xs text-muted-foreground mt-0.5">{settlement.remarks}</p>}
        </div>
        <span className="text-2xl font-bold text-primary">{formatCurrency(toNum(settlement.netPayable))}</span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────

export default function ExitManagement() {
  const qc = useQueryClient();
  const { formatDate } = useHrmsFormatters();

  const [createOpen, setCreateOpen] = useState(false);
  const [expandedExit, setExpandedExit] = useState<string | null>(null);
  const [activeExitTab, setActiveExitTab] = useState<Record<string, "clearance" | "fnf">>({});
  const [form, setForm] = useState<ExitFormState>(initForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [statusTarget, setStatusTarget] = useState<{ exit: ExitRequestDTO; next: ExitRequestStatus } | null>(null);

  // Backend returns List<ExitRequestResponseDTO>, not a Page
  const { data: exits = [], isLoading } = useQuery({
    queryKey: ["hrms", "exit"],
    queryFn: () => hrmsService.listExitRequests().then((r) => r.data),
  });

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.staffRef) errs.staffRef = "Staff member is required.";
    if (!form.resignationDate) errs.resignationDate = "Resignation date is required.";
    if (!form.lastWorkingDate) errs.lastWorkingDate = "Last working date is required.";
    if (!form.exitReason.trim()) errs.exitReason = "Reason is required.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: () => {
      if (!validate()) throw new Error("Validation failed");
      return hrmsService.createExitRequest({
        staffRef: form.staffRef!,
        resignationDate: form.resignationDate,
        lastWorkingDate: form.lastWorkingDate,
        exitReason: form.exitReason.trim(),
      });
    },
    onSuccess: () => {
      toast.success("Exit request created");
      qc.invalidateQueries({ queryKey: ["hrms", "exit"] });
      setCreateOpen(false);
      setForm(initForm());
      setFormErrors({});
    },
    onError: (err) => {
      const normalized = normalizeHrmsError(err);
      if (normalized.fieldErrors) {
        const mapped: Record<string, string> = {};
        Object.entries(normalized.fieldErrors).forEach(([k, v]) => {
          mapped[k] = Array.isArray(v) ? v[0] : v;
        });
        setFormErrors(mapped);
      }
      toast.error(normalized.message);
    },
  });

  const advanceMutation = useMutation({
    mutationFn: ({ exitId, status }: { exitId: string; status: ExitRequestStatus }) =>
      hrmsService.updateExitStatus(exitId, status),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["hrms", "exit"] });
      setStatusTarget(null);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const getNextStatus = (current: ExitRequestStatus): ExitRequestStatus | null => {
    const idx = STATUS_SEQUENCE.indexOf(current);
    if (idx < 0 || idx >= STATUS_SEQUENCE.length - 1) return null;
    return STATUS_SEQUENCE[idx + 1];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exit Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage staff separations, clearances, and full &amp; final settlements
          </p>
        </div>
        <Button onClick={() => { setForm(initForm()); setFormErrors({}); setCreateOpen(true); }} className="shadow-sm">
          <Plus className="mr-2 h-4 w-4" />
          New Exit Request
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (exits as ExitRequestDTO[]).length === 0 ? (
        <EmptyState
          icon={LogOut}
          title="No exit requests"
          description="Exit requests raised through resignation or termination will appear here."
          actionLabel="New Exit Request"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {(exits as ExitRequestDTO[]).map((exit) => {
            const nextStatus = getNextStatus(exit.status);
            const panelTab = activeExitTab[exit.uuid] ?? "clearance";
            const statusCfg = EXIT_STATUS_CONFIG[exit.status];
            const isExpanded = expandedExit === exit.uuid;
            const stepIdx = STATUS_SEQUENCE.indexOf(exit.status);

            return (
              <Card key={exit.uuid} className="overflow-hidden transition-shadow hover:shadow-md">
                {/* Progress strip */}
                <div className="h-1 bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.max(10, ((stepIdx + 1) / STATUS_SEQUENCE.length) * 100)}%` }}
                  />
                </div>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <CardTitle className="text-base">{exit.staffName}</CardTitle>
                      {exit.designationName && (
                        <p className="text-xs text-muted-foreground">{exit.designationName}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>Resigned: <span className="font-medium text-foreground">{formatDate(exit.resignationDate)}</span></span>
                        {exit.lastWorkingDate && (
                          <span>LWD: <span className="font-medium text-foreground">{formatDate(exit.lastWorkingDate)}</span></span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`${statusCfg.color} flex items-center gap-1`}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </Badge>
                        {exit.fnfStatus && (
                          <Badge className={FNF_STATUS_COLORS[exit.fnfStatus]}>
                            FnF: {exit.fnfStatus}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {nextStatus && exit.status !== "WITHDRAWN" && (
                        <Button size="sm" variant="outline" className="text-xs"
                          onClick={() => setStatusTarget({ exit, next: nextStatus })}>
                          Advance → {EXIT_STATUS_CONFIG[nextStatus].label}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-xs gap-1"
                        onClick={() => setExpandedExit((p) => p === exit.uuid ? null : exit.uuid)}>
                        {isExpanded ? <><ChevronUp className="h-3.5 w-3.5" /> Collapse</> : <><ChevronDown className="h-3.5 w-3.5" /> Manage</>}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />
                    <div className="mb-4 flex gap-2">
                      <Button size="sm" variant={panelTab === "clearance" ? "default" : "outline"}
                        className="gap-1.5 text-xs"
                        onClick={() => setActiveExitTab((p) => ({ ...p, [exit.uuid]: "clearance" }))}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Clearance
                      </Button>
                      <Button size="sm" variant={panelTab === "fnf" ? "default" : "outline"}
                        className="gap-1.5 text-xs"
                        onClick={() => setActiveExitTab((p) => ({ ...p, [exit.uuid]: "fnf" }))}>
                        <DollarSign className="h-3.5 w-3.5" />
                        Full &amp; Final
                      </Button>
                    </div>
                    {panelTab === "clearance" ? <ClearancePanel exitId={exit.uuid} /> : <FnFPanel exit={exit} />}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Create Dialog ──────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setFormErrors({}); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Exit Request</DialogTitle>
            <DialogDescription>Register a staff separation. Clearance items will be auto-created.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <StaffSearchSelect
                value={form.staffRef}
                onChange={(uuid) => { setForm((p) => ({ ...p, staffRef: uuid })); setFormErrors((e) => ({ ...e, staffRef: "" })); }}
                label="Staff Member"
              />
              {formErrors.staffRef && <p className="text-xs text-destructive">{formErrors.staffRef}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Resignation Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.resignationDate}
                  onChange={(e) => { setForm((p) => ({ ...p, resignationDate: e.target.value })); setFormErrors((err) => ({ ...err, resignationDate: "" })); }} />
                {formErrors.resignationDate && <p className="text-xs text-destructive">{formErrors.resignationDate}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Last Working Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.lastWorkingDate}
                  onChange={(e) => { setForm((p) => ({ ...p, lastWorkingDate: e.target.value })); setFormErrors((err) => ({ ...err, lastWorkingDate: "" })); }} />
                {formErrors.lastWorkingDate && <p className="text-xs text-destructive">{formErrors.lastWorkingDate}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason for Separation <span className="text-destructive">*</span></Label>
              <Textarea value={form.exitReason}
                onChange={(e) => { setForm((p) => ({ ...p, exitReason: e.target.value })); setFormErrors((err) => ({ ...err, exitReason: "" })); }}
                placeholder="e.g. Resignation, Better opportunity..."
                rows={3} />
              {formErrors.exitReason && <p className="text-xs text-destructive">{formErrors.exitReason}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setFormErrors({}); }}>Cancel</Button>
            <Button disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Exit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Advance Status Confirm ─────────────────────────── */}
      <ReviewDialog
        open={!!statusTarget}
        onOpenChange={(o) => !o && setStatusTarget(null)}
        title="Advance Exit Status"
        description={`Move ${statusTarget?.exit.staffName}'s exit to "${statusTarget ? EXIT_STATUS_CONFIG[statusTarget.next].label : ""}" status?`}
        severity="warning"
        confirmLabel="Advance"
        onConfirm={() => statusTarget && advanceMutation.mutate({ exitId: statusTarget.exit.uuid, status: statusTarget.next })}
        isPending={advanceMutation.isPending}
      >
        <div />
      </ReviewDialog>
    </div>
  );
}
