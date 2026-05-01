import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  GripVertical,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type {
  ApprovalActionType,
  ApprovalChainConfigDTO,
  ApprovalChainStepDTO,
} from "@/services/types/hrms";
import EmptyState from "@/features/hrms/components/EmptyState";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";

const ACTION_TYPE_LABELS: Record<ApprovalActionType, string> = {
  LEAVE: "Leave",
  PAYROLL_RUN: "Payroll Run",
  PROMOTION: "Promotion",
  EXPENSE_CLAIM: "Expense Claim",
  LOAN_REQUEST: "Loan Request",
  EXIT_REQUEST: "Exit Request",
};

const ACTION_TYPE_OPTIONS = Object.entries(ACTION_TYPE_LABELS) as [
  ApprovalActionType,
  string,
][];

interface FormState {
  chainName: string;
  actionType: ApprovalActionType | "";
  isActive: boolean;
  steps: ApprovalChainStepDTO[];
}

const DEFAULT_FORM: FormState = {
  chainName: "",
  actionType: "",
  isActive: true,
  steps: [{ stepOrder: 1, approverRole: "", stepLabel: "" }],
};

export default function ApprovalChainConfig() {
  const qc = useQueryClient();
  const originalFormRef = useRef<FormState | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ApprovalChainConfigDTO | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ApprovalChainConfigDTO | null>(
    null
  );

  const isDirty = useMemo(
    () => !editing || JSON.stringify(form) !== JSON.stringify(originalFormRef.current),
    [form, editing],
  );

  const { data: chains = [], isLoading } = useQuery({
    queryKey: ["hrms", "approval-chains"],
    queryFn: () => hrmsService.listApprovalChains().then((r) => r.data),
  });

  useEffect(() => {
    if (editing) {
      const editForm: FormState = {
        chainName: editing.chainName,
        actionType: editing.actionType,
        isActive: editing.isActive,
        steps: editing.steps.map((s) => ({ ...s })),
      };
      originalFormRef.current = editForm;
      setForm(editForm);
    } else {
      originalFormRef.current = null;
      setForm(DEFAULT_FORM);
    }
  }, [editing, formOpen]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form.actionType) throw new Error("Action type is required.");
      if (form.steps.some((s) => !s.approverRole || !s.stepLabel))
        throw new Error("All step fields are required.");
      const payload = {
        chainName: form.chainName.trim(),
        actionType: form.actionType as ApprovalActionType,
        isActive: form.isActive,
        steps: form.steps.map((s, i) => ({ ...s, stepOrder: i + 1 })),
      };
      return editing
        ? hrmsService.updateApprovalChain(editing.uuid, payload)
        : hrmsService.createApprovalChain(payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Chain updated" : "Chain created");
      qc.invalidateQueries({ queryKey: ["hrms", "approval-chains"] });
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (uuid: string) => hrmsService.deleteApprovalChain(uuid),
    onSuccess: () => {
      toast.success("Chain deleted");
      qc.invalidateQueries({ queryKey: ["hrms", "approval-chains"] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const addStep = () =>
    setForm((p) => ({
      ...p,
      steps: [
        ...p.steps,
        { stepOrder: p.steps.length + 1, approverRole: "", stepLabel: "" },
      ],
    }));

  const removeStep = (idx: number) =>
    setForm((p) => ({
      ...p,
      steps: p.steps.filter((_, i) => i !== idx),
    }));

  const updateStep = (
    idx: number,
    field: keyof ApprovalChainStepDTO,
    value: string | number
  ) =>
    setForm((p) => {
      const steps = [...p.steps];
      steps[idx] = { ...steps[idx], [field]: value };
      return { ...p, steps };
    });

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              🔗
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Approval Chain Configuration</h2>
              <p className="text-sm text-white/70">Define multi-step approval workflows for different actions</p>
            </div>
          </div>
          <Button onClick={openCreate} className="bg-white text-orange-700 hover:bg-white/90 font-semibold shadow-sm">
            ➕ New Chain
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : chains.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No approval chains configured"
          description="Create your first approval chain to enable multi-step approvals."
          actionLabel="New Chain"
          onAction={openCreate}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {chains.map((chain) => (
            <Card key={chain.uuid}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{chain.chainName}</CardTitle>
                      <Badge
                        variant="secondary"
                        className={
                          chain.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {chain.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <Badge variant="outline">
                      {ACTION_TYPE_LABELS[chain.actionType]}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditing(chain);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(chain)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {chain.steps.map((step) => (
                    <div
                      key={step.stepOrder}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {step.stepOrder}
                      </span>
                      <span className="font-medium">{step.stepLabel}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{step.approverRole}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(o) => {
          if (!o) { setFormOpen(false); setEditing(null); }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Approval Chain" : "Create Approval Chain"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Chain Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.chainName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, chainName: e.target.value }))
                }
                placeholder="e.g. Leave Approval Chain"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Action Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.actionType}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, actionType: v as ApprovalActionType }))
                }
                disabled={!!editing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select action type..." />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPE_OPTIONS.map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="chain-active">Active</Label>
              <Switch
                id="chain-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Approval Steps</Label>
                <Button variant="outline" size="sm" onClick={addStep}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Step
                </Button>
              </div>
              {form.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <GripVertical className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="mt-2.5 text-sm font-semibold text-muted-foreground">
                    {idx + 1}.
                  </span>
                  <div className="flex flex-1 gap-2">
                    <Input
                      placeholder="Step label"
                      value={step.stepLabel}
                      onChange={(e) => updateStep(idx, "stepLabel", e.target.value)}
                    />
                    <Input
                      placeholder="Approver role"
                      value={step.approverRole}
                      onChange={(e) =>
                        updateStep(idx, "approverRole", e.target.value)
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-0.5 h-8 w-8 text-destructive hover:text-destructive"
                    disabled={form.steps.length === 1}
                    onClick={() => removeStep(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setFormOpen(false); setEditing(null); }}
            >
              Cancel
            </Button>
            <Button
              disabled={saveMutation.isPending || !form.chainName || !form.actionType || !isDirty}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editing ? "Save Changes" : "Create Chain"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ReviewDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Approval Chain"
        description={`Permanently delete "${deleteTarget?.chainName}"? Any in-progress approvals using this chain will be affected.`}
        severity="danger"
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.uuid)}
        isPending={deleteMutation.isPending}
        requireCheckbox
        checkboxLabel="I understand this may affect active workflows"
      >
        <div />
      </ReviewDialog>
    </div>
  );
}
