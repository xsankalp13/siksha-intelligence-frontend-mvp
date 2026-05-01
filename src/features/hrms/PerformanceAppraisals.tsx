import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronRight,
  Loader2,
  Plus,
  Star,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type {
  AppraisalCycleDTO,
  AppraisalCycleStatus,
  AppraisalCycleType,
  AppraisalGoalDTO,
  AppraisalSummaryDTO,
} from "@/services/types/hrms";
import EmptyState from "@/features/hrms/components/EmptyState";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";

const CYCLE_STATUS_COLORS: Record<AppraisalCycleStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  GOAL_SETTING:
    "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  SELF_REVIEW:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  MANAGER_REVIEW:
    "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  HR_REVIEW:
    "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  COMPLETED:
    "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
};

const STATUS_SEQUENCE: AppraisalCycleStatus[] = [
  "DRAFT",
  "GOAL_SETTING",
  "SELF_REVIEW",
  "MANAGER_REVIEW",
  "HR_REVIEW",
  "COMPLETED",
];

const CYCLE_TYPE_LABELS: Record<AppraisalCycleType, string> = {
  ANNUAL: "Annual",
  BIANNUAL: "Bi-Annual",
  QUARTERLY: "Quarterly",
};

interface CycleFormState {
  name: string;
  cycleType: AppraisalCycleType | "";
  fromDate: string;
  toDate: string;
}

function CycleDetailPanel({ cycle }: { cycle: AppraisalCycleDTO }) {
  const qc = useQueryClient();
  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [selectedStaffRef, setSelectedStaffRef] = useState<string>("");
  const [goalForm, setGoalForm] = useState({ title: "", description: "", targetValue: "" });

  const { data: summaryResponse, isLoading: loadingSummary } = useQuery({
    queryKey: ["hrms", "appraisals", cycle.uuid, "summary"],
    queryFn: () => hrmsService.getCycleSummary(cycle.uuid).then((r) => r.data),
  });

  const summary = summaryResponse?.content ?? [];

  useEffect(() => {
    if (!selectedStaffRef && summary[0]?.staffRef) {
      setSelectedStaffRef(summary[0].staffRef);
    }
  }, [selectedStaffRef, summary]);

  const { data: goals = [], isLoading: loadingGoals } = useQuery({
    queryKey: ["hrms", "appraisals", cycle.uuid, selectedStaffRef, "goals"],
    queryFn: () => hrmsService.listCycleGoals(cycle.uuid, selectedStaffRef).then((r) => r.data),
    enabled: !!selectedStaffRef,
  });

  const resolvedSelectedStaffRef = selectedStaffRef || summary[0]?.staffRef || "";

  const addGoalMutation = useMutation({
    mutationFn: () => {
      if (!resolvedSelectedStaffRef) throw new Error("Select a staff member first.");
      if (!goalForm.title.trim()) throw new Error("Goal title is required.");
      return hrmsService.createGoal(cycle.uuid, {
        staffRef: resolvedSelectedStaffRef,
        goalTitle: goalForm.title.trim(),
        description: goalForm.description || undefined,
        targetMetric: goalForm.targetValue || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Goal added");
      qc.invalidateQueries({ queryKey: ["hrms", "appraisals", cycle.uuid, "goals"] });
      setGoalFormOpen(false);
      setGoalForm({ title: "", description: "", targetValue: "" });
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  if (loadingGoals || loadingSummary)
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          Goals ({goals.length})
        </p>
        {cycle.status === "GOAL_SETTING" && (
          <Button size="sm" variant="outline" onClick={() => setGoalFormOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Goal
          </Button>
        )}
      </div>
      {summary.length > 0 && (
        <div className="space-y-1.5">
          <Label>Staff Member</Label>
          <Select value={resolvedSelectedStaffRef} onValueChange={setSelectedStaffRef}>
            <SelectTrigger>
              <SelectValue placeholder="Select staff" />
            </SelectTrigger>
            <SelectContent>
              {summary.map((row: AppraisalSummaryDTO) => (
                <SelectItem key={row.staffRef} value={row.staffRef}>
                  {row.staffName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No goals set yet.</p>
      ) : (
        <div className="space-y-2">
          {goals.map((goal: AppraisalGoalDTO) => (
            <div key={goal.uuid} className="flex items-start justify-between rounded-md border p-2.5">
              <div>
                <p className="text-sm font-medium">{goal.goalTitle}</p>
                {goal.description && (
                  <p className="text-xs text-muted-foreground">{goal.description}</p>
                )}
                {goal.targetMetric && (
                  <p className="text-xs text-muted-foreground">Target: {goal.targetMetric}</p>
                )}
              </div>
              {goal.weightage != null && (
                <Badge variant="secondary">{goal.weightage}%</Badge>
              )}
            </div>
          ))}
        </div>
      )}

      {summary.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="mb-2 text-sm font-semibold">Appraisal Summary</p>
            <div className="space-y-1.5">
              {summary.map((row: AppraisalSummaryDTO) => (
                <div key={row.staffRef} className="flex items-center justify-between rounded-md border p-2.5 text-sm">
                  <span className="font-medium">{row.staffName}</span>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    {row.selfRating != null && (
                      <span className="flex items-center gap-1">
                        Self: <Star className="h-3.5 w-3.5" /> {row.selfRating}
                      </span>
                    )}
                    {row.managerRating != null && (
                      <span className="flex items-center gap-1">
                        Mgr: <Star className="h-3.5 w-3.5" /> {row.managerRating}
                      </span>
                    )}
                    {row.recommendation && (
                      <Badge variant="outline">{row.recommendation}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Add Goal Dialog */}
      <Dialog open={goalFormOpen} onOpenChange={setGoalFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                value={goalForm.title}
                onChange={(e) => setGoalForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Improve student pass percentage by 10%"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={goalForm.description}
                onChange={(e) => setGoalForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Target Value</Label>
              <Input
                value={goalForm.targetValue}
                onChange={(e) => setGoalForm((p) => ({ ...p, targetValue: e.target.value }))}
                placeholder="e.g. 90% pass rate"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGoalFormOpen(false)}>Cancel</Button>
            <Button disabled={addGoalMutation.isPending || !goalForm.title} onClick={() => addGoalMutation.mutate()}>
              {addGoalMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PerformanceAppraisals() {
  const qc = useQueryClient();
  const { formatDate } = useHrmsFormatters();

  const [cycleFormOpen, setCycleFormOpen] = useState(false);
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);
  const [cycleForm, setCycleForm] = useState<CycleFormState>({
    name: "",
    cycleType: "",
    fromDate: "",
    toDate: "",
  });
  const [advanceTarget, setAdvanceTarget] = useState<{ cycle: AppraisalCycleDTO; next: AppraisalCycleStatus } | null>(null);

  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ["hrms", "appraisals"],
    queryFn: () => hrmsService.listAppraisalCycles().then((r) => r.data),
  });

  const createCycleMutation = useMutation({
    mutationFn: () => {
      if (!cycleForm.name || !cycleForm.cycleType || !cycleForm.fromDate || !cycleForm.toDate)
        throw new Error("All cycle fields are required.");
      return hrmsService.createAppraisalCycle({
        cycleName: cycleForm.name,
        startDate: cycleForm.fromDate,
        endDate: cycleForm.toDate,
      });
    },
    onSuccess: () => {
      toast.success("Appraisal cycle created");
      qc.invalidateQueries({ queryKey: ["hrms", "appraisals"] });
      setCycleFormOpen(false);
      setCycleForm({ name: "", cycleType: "", fromDate: "", toDate: "" });
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const advanceMutation = useMutation({
    mutationFn: ({ cycleId, nextStatus }: { cycleId: string; nextStatus: AppraisalCycleStatus }) =>
      hrmsService.advanceAppraisalCycle(cycleId, nextStatus),
    onSuccess: () => {
      toast.success("Cycle advanced");
      qc.invalidateQueries({ queryKey: ["hrms", "appraisals"] });
      setAdvanceTarget(null);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const getNextStatus = (current: AppraisalCycleStatus): AppraisalCycleStatus | null => {
    const idx = STATUS_SEQUENCE.indexOf(current);
    if (idx < 0 || idx >= STATUS_SEQUENCE.length - 1) return null;
    return STATUS_SEQUENCE[idx + 1];
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              ⭐
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Performance Appraisals</h2>
              <p className="text-sm text-white/70">Manage appraisal cycles, goals, and performance reviews</p>
            </div>
          </div>
          <Button onClick={() => setCycleFormOpen(true)} className="bg-white text-rose-700 hover:bg-white/90 font-semibold shadow-sm">
            ➕ New Cycle
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : cycles.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No appraisal cycles"
          description="Create your first appraisal cycle to start collecting performance data."
          actionLabel="New Cycle"
          onAction={() => setCycleFormOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle: AppraisalCycleDTO) => {
            const next = getNextStatus(cycle.status);
            return (
              <Card key={cycle.uuid}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{cycle.cycleName}</CardTitle>
                        <Badge variant="secondary" className={CYCLE_STATUS_COLORS[cycle.status]}>
                          {cycle.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(cycle.startDate)} – {formatDate(cycle.endDate)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {next && cycle.status !== "COMPLETED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAdvanceTarget({ cycle, next })}
                        >
                          Advance to {next.replace("_", " ")}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setExpandedCycle((p) => p === cycle.uuid ? null : cycle.uuid)
                        }
                      >
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${expandedCycle === cycle.uuid ? "rotate-90" : ""}`}
                        />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {expandedCycle === cycle.uuid && (
                  <CardContent>
                    <Separator className="mb-3" />
                    <CycleDetailPanel cycle={cycle} />
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Cycle Dialog */}
      <Dialog open={cycleFormOpen} onOpenChange={setCycleFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Appraisal Cycle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cycle Name <span className="text-destructive">*</span></Label>
              <Input
                value={cycleForm.name}
                onChange={(e) => setCycleForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. AY 2024-25 Annual Review"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cycle Type <span className="text-destructive">*</span></Label>
              <Select
                value={cycleForm.cycleType}
                onValueChange={(v) => setCycleForm((p) => ({ ...p, cycleType: v as AppraisalCycleType }))}
              >
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CYCLE_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={cycleForm.fromDate} onChange={(e) => setCycleForm((p) => ({ ...p, fromDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>To Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={cycleForm.toDate} onChange={(e) => setCycleForm((p) => ({ ...p, toDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCycleFormOpen(false)}>Cancel</Button>
            <Button
              disabled={createCycleMutation.isPending || !cycleForm.name || !cycleForm.cycleType}
              onClick={() => createCycleMutation.mutate()}
            >
              {createCycleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Cycle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advance Status Confirm */}
      <ReviewDialog
        open={!!advanceTarget}
        onOpenChange={(o) => !o && setAdvanceTarget(null)}
        title="Advance Appraisal Stage"
        description={`Move "${advanceTarget?.cycle.cycleName}" to "${advanceTarget?.next.replace("_", " ")}" stage? All participants will be notified.`}
        severity="warning"
        confirmLabel="Advance"
        onConfirm={() =>
          advanceTarget &&
          advanceMutation.mutate({ cycleId: advanceTarget.cycle.uuid, nextStatus: advanceTarget.next })
        }
        isPending={advanceMutation.isPending}
      >
        <div />
      </ReviewDialog>
    </div>
  );
}
