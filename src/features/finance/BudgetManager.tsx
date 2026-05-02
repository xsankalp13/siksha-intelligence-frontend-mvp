import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PiggyBank, Plus, RefreshCw,
  Pencil, Trash2, Send, CheckCircle, XCircle, RotateCcw,
  ArrowDownRight, ArrowUpRight, Minus, Filter, X,
  Archive, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import {
  budgetService,
  type BudgetSummaryDTO,
  type BudgetResponseDTO,
  type BudgetCreateDTO,
  type BudgetLineItemCreateDTO,
  type BudgetStatus,
} from "@/services/budget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<BudgetStatus, { label: string; icon: any; color: string; bg: string }> = {
  DRAFT:              { label: "Draft",             icon: Pencil,       color: "text-slate-600",   bg: "bg-slate-500/10" },
  SUBMITTED:          { label: "Submitted",          icon: Send,         color: "text-blue-600",    bg: "bg-blue-500/10" },
  APPROVED:           { label: "Approved",           icon: CheckCircle,  color: "text-emerald-600", bg: "bg-emerald-500/10" },
  REVISION_REQUESTED: { label: "Needs Revision",     icon: RotateCcw,    color: "text-amber-600",   bg: "bg-amber-500/10" },
  REJECTED:           { label: "Rejected",           icon: XCircle,      color: "text-rose-600",    bg: "bg-rose-500/10" },
  CLOSED:             { label: "Closed",             icon: Archive,      color: "text-purple-600",  bg: "bg-purple-500/10" },
};

const VARIANCE_META = {
  UNDER:    { label: "Under Budget", color: "text-blue-600", icon: ArrowDownRight },
  ON_TRACK: { label: "On Track",     color: "text-emerald-600", icon: Minus },
  OVER:     { label: "Over Budget",  color: "text-rose-600", icon: ArrowUpRight },
};

const INR = (v: number) => `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BudgetStatus }) {
  const m = STATUS_META[status];
  return (
    <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0 h-5 border-transparent ${m.color} ${m.bg}`}>
      {m.label}
    </Badge>
  );
}

// ── Utilisation Bar ───────────────────────────────────────────────────────────

function UtilBar({ pct, varianceStatus }: { pct: number; varianceStatus: string }) {
  const capped = Math.min(pct, 100);
  const color = varianceStatus === "OVER" ? "bg-rose-500"
              : varianceStatus === "ON_TRACK" ? "bg-emerald-500"
              : "bg-blue-500";
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${capped}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

// ── Overall Utilisation Arc (big visual) ──────────────────────────────────────

function UtilArc({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100);
  const color = pct > 100 ? "#f43f5e" : pct >= 75 ? "#10b981" : "#3b82f6";
  const r = 40, cx = 50, cy = 50;
  const circumference = 2 * Math.PI * r;
  const dashoffset = circumference * (1 - capped / 100);
  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24">
      <circle cx={cx} cy={cy} r={r} stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
      <circle
        cx={cx} cy={cy} r={r}
        stroke={color} strokeWidth="10" fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="bold" fill={color}>
        {pct.toFixed(0)}%
      </text>
    </svg>
  );
}

// ── Budget Detail Drawer ──────────────────────────────────────────────────────

function BudgetDetailPanel({
  budgetId,
  onRefresh,
  isReadOnly = false,
}: {
  budgetId: number;
  onRefresh: () => void;
  isReadOnly?: boolean;
}) {
  const [detail, setDetail] = useState<BudgetResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewApprove, setReviewApprove] = useState(true);
  const [reviewNotes, setReviewNotes] = useState("");
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await budgetService.getById(budgetId);
      setDetail(res.data);
    } catch {
      toast.error("Failed to load budget detail.");
    } finally {
      setLoading(false);
    }
  }, [budgetId]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (action: () => Promise<any>, msg: string) => {
    setActing(true);
    try {
      await action();
      toast.success(msg);
      onRefresh();
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Action failed.");
    } finally {
      setActing(false);
    }
  };

  if (loading || !detail) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-muted" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">
            {detail.departmentName} — {detail.academicYear}
          </h3>
          {detail.title && <p className="text-xs text-muted-foreground">{detail.title}</p>}
          <div className="mt-1"><StatusBadge status={detail.status} /></div>
        </div>
        <UtilArc pct={detail.utilisationPct} />
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Allocated", value: INR(detail.totalAllocated), color: "text-foreground" },
          { label: "Spent",     value: INR(detail.totalSpent),     color: detail.totalSpent > detail.totalAllocated ? "text-rose-600" : "text-emerald-600" },
          { label: "Variance",  value: INR(Math.abs(detail.totalVariance)), color: detail.totalVariance >= 0 ? "text-blue-600" : "text-rose-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-muted/40 rounded-xl px-3 py-2 text-center">
            <p className={`text-base font-black ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[10px] text-muted-foreground font-medium">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Notes */}
      {detail.reviewerNotes && (
        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-700">
          <p className="font-bold mb-0.5">Reviewer Notes</p>
          <p>{detail.reviewerNotes}</p>
        </div>
      )}

      {/* Line items */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Line Items</p>
        {detail.lineItems.map((line) => {
          const vm = VARIANCE_META[line.varianceStatus as keyof typeof VARIANCE_META] ?? VARIANCE_META.UNDER;
          return (
            <div key={line.lineItemId} className="space-y-1.5 p-3 rounded-xl border border-border/30 bg-background/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{line.category}</p>
                  {line.linkedAccountCode && (
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {line.linkedAccountCode} — {line.linkedAccountName}
                    </p>
                  )}
                </div>
                <span className={`text-[10px] font-bold ${vm.color}`}>{vm.label}</span>
              </div>
              <UtilBar pct={line.utilisationPct} varianceStatus={line.varianceStatus} />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Allocated: <strong className="text-foreground">{INR(line.allocatedAmount)}</strong></span>
                <span>Actual: <strong className="text-foreground">{INR(line.actualAmount)}</strong></span>
                <span className={vm.color}>Δ {INR(Math.abs(line.variance))}</span>
              </div>
              {line.notes && <p className="text-[10px] text-muted-foreground italic">{line.notes}</p>}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
          {detail.status === "DRAFT" && (
            <Button size="sm" onClick={() => doAction(() => budgetService.submit(detail.id), "Budget submitted for review.")} disabled={acting}>
              <Send className="h-3.5 w-3.5 mr-1.5" /> Submit for Review
            </Button>
          )}
          {detail.status === "REVISION_REQUESTED" && (
            <Button size="sm" onClick={() => doAction(() => budgetService.submit(detail.id), "Budget resubmitted.")} disabled={acting}>
              <Send className="h-3.5 w-3.5 mr-1.5" /> Resubmit
            </Button>
          )}
          {detail.status === "SUBMITTED" && (
            <>
              <Button size="sm" onClick={() => { setReviewApprove(true); setReviewNotes(""); setReviewDialogOpen(true); }} disabled={acting}>
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setReviewApprove(false); setReviewNotes(""); setReviewDialogOpen(true); }} disabled={acting}>
                <XCircle className="h-3.5 w-3.5 mr-1.5 text-rose-500" /> Reject
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setReviewApprove(false); setReviewNotes(""); setReviewDialogOpen(true); }} disabled={acting}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-amber-500" /> Request Revision
              </Button>
            </>
          )}
          {detail.status === "APPROVED" && (
            <Button size="sm" variant="outline" onClick={() => doAction(() => budgetService.close(detail.id), "Budget closed.")} disabled={acting}>
              <Archive className="h-3.5 w-3.5 mr-1.5" /> Close Budget
            </Button>
          )}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{reviewApprove ? "Approve Budget" : "Reject / Request Revision"}</DialogTitle>
            <DialogDescription>
              {reviewApprove ? "This budget will be marked as Approved." : "Provide a reason for rejection or revision."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="rev-notes">Notes {!reviewApprove && "(required)"}</Label>
            <Textarea id="rev-notes" rows={3} placeholder="Enter your comments..."
              value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => doAction(
                () => budgetService.review(detail.id, { approved: reviewApprove, reviewerNotes: reviewNotes }),
                reviewApprove ? "Budget approved!" : "Budget rejected."
              )}
              className={!reviewApprove ? "bg-rose-600 hover:bg-rose-700" : ""}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Budget Form Dialog ────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [`${CURRENT_YEAR}-${CURRENT_YEAR + 1}`, `${CURRENT_YEAR + 1}-${CURRENT_YEAR + 2}`];

const COMMON_CATEGORIES = [
  "Faculty Salary", "Staff Salary", "EPF / ESI Contributions", "Lab Equipment",
  "Lab Supplies & Chemicals", "Library Books & Journals", "Research Expenses",
  "Electricity Bill", "Internet & Telecom", "Building Maintenance", "IT Hardware & Software",
  "Office Stationery", "Travel & Conveyance", "Events & Conferences", "Marketing & Outreach",
];

function BudgetFormDialog({
  open,
  onClose,
  onSaved,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: BudgetResponseDTO | null;
}) {
  const [dept, setDept] = useState("");
  const [year, setYear] = useState(YEAR_OPTIONS[0]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<BudgetLineItemCreateDTO[]>([
    { category: "", allocatedAmount: 0 },
    { category: "", allocatedAmount: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setDept(editing.departmentName);
      setYear(editing.academicYear);
      setTitle(editing.title ?? "");
      setNotes(editing.submitterNotes ?? "");
      setLines(editing.lineItems.map((l) => ({
        category: l.category,
        allocatedAmount: l.allocatedAmount,
        linkedAccountId: l.linkedAccountId ?? undefined,
        notes: l.notes ?? undefined,
      })));
    } else {
      setDept(""); setYear(YEAR_OPTIONS[0]); setTitle(""); setNotes("");
      setLines([{ category: "", allocatedAmount: 0 }, { category: "", allocatedAmount: 0 }]);
    }
  }, [editing, open]);

  const updateLine = (idx: number, field: keyof BudgetLineItemCreateDTO, value: any) =>
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));

  const addLine = () => setLines((prev) => [...prev, { category: "", allocatedAmount: 0 }]);
  const removeLine = (idx: number) => { if (lines.length > 1) setLines((prev) => prev.filter((_, i) => i !== idx)); };

  const totalAllocated = lines.reduce((s, l) => s + (l.allocatedAmount || 0), 0);

  const handleSave = async () => {
    if (!dept.trim()) { toast.error("Department name is required."); return; }
    if (lines.some(l => !l.category.trim())) { toast.error("All line items must have a category."); return; }
    if (lines.some(l => !l.allocatedAmount || l.allocatedAmount <= 0)) { toast.error("All line items must have a positive amount."); return; }

    setSaving(true);
    const payload: BudgetCreateDTO = { departmentName: dept, academicYear: year, title, submitterNotes: notes, lineItems: lines };
    try {
      if (editing) {
        await budgetService.update(editing.id, payload);
        toast.success("Budget updated.");
      } else {
        await budgetService.create(payload);
        toast.success("Budget created.");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save budget.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Budget" : "Create Department Budget"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Header */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="b-dept">Department *</Label>
              <Input id="b-dept" placeholder="e.g. Computer Science, Admin, Library"
                value={dept} onChange={(e) => setDept(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-year">Academic Year *</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="b-year"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  <SelectItem value={`${CURRENT_YEAR - 1}-${CURRENT_YEAR}`}>{`${CURRENT_YEAR - 1}-${CURRENT_YEAR}`}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="b-title">Budget Title (optional)</Label>
            <Input id="b-title" placeholder="e.g. CSE Dept FY 2025-26 Annual Budget"
              value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Budget Line Items</p>
            <div className="grid grid-cols-[1fr_120px_1fr_24px] gap-2 text-[10px] text-muted-foreground px-1">
              <span>Category *</span>
              <span className="text-right">Amount (₹) *</span>
              <span>Notes</span>
              <span />
            </div>
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_120px_1fr_24px] gap-2 items-center">
                <div className="relative">
                  <Input
                    placeholder="Category name"
                    value={line.category}
                    onChange={(e) => updateLine(idx, "category", e.target.value)}
                    list={`cats-${idx}`}
                    className="h-8 text-xs"
                  />
                  <datalist id={`cats-${idx}`}>
                    {COMMON_CATEGORIES.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <Input
                  type="number" min={0} step={1000} placeholder="0"
                  className="h-8 text-xs text-right"
                  value={line.allocatedAmount || ""}
                  onChange={(e) => updateLine(idx, "allocatedAmount", Number(e.target.value))}
                />
                <Input
                  className="h-8 text-xs" placeholder="Optional notes"
                  value={line.notes ?? ""}
                  onChange={(e) => updateLine(idx, "notes", e.target.value)}
                />
                <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500/60" onClick={() => removeLine(idx)}>✕</Button>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-3 w-3 mr-1" /> Add Line
              </Button>
              <p className="text-sm font-black text-foreground">
                Total: <span className="text-primary">{INR(totalAllocated)}</span>
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="b-notes">Submitter Notes</Label>
            <Textarea id="b-notes" rows={2} placeholder="Any context for the Finance Admin..."
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editing ? "Save Changes" : "Create Budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Budget Card ───────────────────────────────────────────────────────────────

function BudgetCard({
  budget,
  onClick,
  onDelete,
  isReadOnly = false,
}: {
  budget: BudgetSummaryDTO;
  onClick: () => void;
  onDelete: (b: BudgetSummaryDTO) => void;
  isReadOnly?: boolean;
}) {
  const capped = Math.min(budget.utilisationPct, 100);
  const barColor = budget.utilisationPct > 100 ? "bg-rose-500" :
                   budget.utilisationPct >= 75 ? "bg-emerald-500" : "bg-blue-500";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group cursor-pointer rounded-2xl border border-border/40 bg-card/60 p-4 hover:shadow-md hover:border-primary/30 transition-all duration-200"
      onClick={onClick}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-foreground line-clamp-1">{budget.departmentName}</p>
          <p className="text-xs text-muted-foreground">{budget.academicYear}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={budget.status} />
          {!isReadOnly && budget.status === "DRAFT" && (
            <Button
              variant="ghost" size="icon" className="h-6 w-6 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onDelete(budget); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Utilisation bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
          <span>Utilisation</span>
          <span className={`font-bold ${budget.utilisationPct > 100 ? "text-rose-600" : "text-foreground"}`}>
            {budget.utilisationPct.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${capped}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className={`h-full rounded-full ${barColor}`}
          />
        </div>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs font-black text-foreground">{INR(budget.totalAllocated)}</p>
          <p className="text-[9px] text-muted-foreground">Allocated</p>
        </div>
        <div>
          <p className={`text-xs font-black ${budget.totalSpent > budget.totalAllocated ? "text-rose-600" : "text-emerald-600"}`}>
            {INR(budget.totalSpent)}
          </p>
          <p className="text-[9px] text-muted-foreground">Spent</p>
        </div>
        <div>
          <p className={`text-xs font-black ${budget.totalVariance < 0 ? "text-rose-600" : "text-blue-600"}`}>
            {budget.totalVariance >= 0 ? "+" : "-"}{INR(Math.abs(budget.totalVariance))}
          </p>
          <p className="text-[9px] text-muted-foreground">Variance</p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function BudgetManager({ isReadOnly = false }: { isReadOnly?: boolean }) {
  const [budgets, setBudgets] = useState<BudgetSummaryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Filter state
  const [yearFilter, setYearFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [years, setYears] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, yRes] = await Promise.all([
        budgetService.getAll({
          academicYear: yearFilter !== "all" ? yearFilter : undefined,
          status: statusFilter !== "all" ? statusFilter as BudgetStatus : undefined,
        }),
        budgetService.getAcademicYears(),
      ]);
      setBudgets(bRes.data);
      setYears(yRes.data);
    } catch {
      toast.error("Failed to load budgets.");
    } finally {
      setLoading(false);
    }
  }, [yearFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (budget: BudgetSummaryDTO) => {
    if (!confirm(`Delete draft budget for "${budget.departmentName} — ${budget.academicYear}"?`)) return;
    try {
      await budgetService.delete(budget.id);
      toast.success("Budget deleted.");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Cannot delete budget.");
    }
  };

  // KPI strip
  const totalAllocated = budgets.reduce((s, b) => s + Number(b.totalAllocated), 0);
  const totalSpent     = budgets.reduce((s, b) => s + Number(b.totalSpent), 0);
  const pending        = budgets.filter(b => b.status === "SUBMITTED").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            Budget Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Department-wise financial planning, approval workflow, and variance tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {!isReadOnly && (
            <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Budget
            </Button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Allocated", value: INR(totalAllocated), color: "text-foreground" },
          { label: "Total Spent",     value: INR(totalSpent),     color: totalSpent > totalAllocated ? "text-rose-600" : "text-emerald-600" },
          { label: "Total Budgets",   value: String(budgets.length), color: "text-foreground" },
          { label: "Pending Approval", value: String(pending),    color: pending > 0 ? "text-amber-600" : "text-foreground" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border/50 bg-card/60">
            <CardContent className="pt-3 pb-3">
              <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="All years" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="All status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {(Object.keys(STATUS_META) as BudgetStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(yearFilter !== "all" || statusFilter !== "all") && (
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground"
            onClick={() => { setYearFilter("all"); setStatusFilter("all"); }}>
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Grid + Detail panel side by side */}
      <div className={`grid gap-5 ${selectedId ? "grid-cols-5" : "grid-cols-1"}`}>
        {/* Budget cards */}
        <div className={`${selectedId ? "col-span-3" : "col-span-1"}`}>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-muted" />)}
            </div>
          ) : budgets.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold text-foreground">No budgets found.</p>
              <p className="text-xs text-muted-foreground mt-1">Create your first departmental budget to get started.</p>
            </div>
          ) : (
            <div className={`grid gap-4 ${selectedId ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
              {budgets.map((budget) => (
                <BudgetCard
                  key={budget.id}
                  budget={budget}
                  onClick={() => setSelectedId(selectedId === budget.id ? null : budget.id)}
                  onDelete={handleDelete}
                  isReadOnly={isReadOnly}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedId && (
            <motion.div
              key={selectedId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="col-span-2"
            >
              <Card className="border-border/50 bg-card/60 sticky top-0">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Budget Detail</CardTitle>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <BudgetDetailPanel
                    budgetId={selectedId}
                    onRefresh={load}
                    isReadOnly={isReadOnly}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Form Dialog */}
      <BudgetFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        editing={editing}
      />
    </div>
  );
}
