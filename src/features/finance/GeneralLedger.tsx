import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  BookMarked, Plus, RefreshCw, RotateCcw, ChevronDown, ChevronRight,
  FileText, Scale, TrendingUp, TrendingDown, AlertCircle, Filter,
} from "lucide-react";
import { toast } from "sonner";
import {
  glService, coaService,
  type JournalEntryResponseDTO, type JournalLineRequestDTO,
  type JournalEntryStatus, type TrialBalanceRowDTO, type AccountResponseDTO,
} from "@/services/coa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ── Status Badge ──────────────────────────────────────────────────────────────

const statusMeta: Record<JournalEntryStatus, { label: string; color: string }> = {
  DRAFT:    { label: "Draft",    color: "text-muted-foreground bg-muted" },
  POSTED:   { label: "Posted",   color: "text-emerald-600 bg-emerald-500/10" },
  REVERSED: { label: "Reversed", color: "text-rose-600 bg-rose-500/10" },
};

function StatusBadge({ status }: { status: JournalEntryStatus }) {
  const meta = statusMeta[status] ?? { label: status, color: "text-muted-foreground bg-muted" };
  return (
    <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 h-4 border-transparent ${meta.color}`}>
      {meta.label}
    </Badge>
  );
}

// ── Journal Entry Row ─────────────────────────────────────────────────────────

function JournalEntryRow({
  entry,
  onReverse,
}: {
  entry: JournalEntryResponseDTO;
  onReverse: (entry: JournalEntryResponseDTO) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border/30 rounded-xl overflow-hidden">
      {/* Summary row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3.5 hover:bg-muted/30 transition-colors text-left"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> :
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}

        <span className="text-xs font-mono font-bold text-foreground/70 w-28 shrink-0">{entry.entryNumber}</span>
        <span className="text-xs text-muted-foreground w-20 shrink-0">
          {format(new Date(entry.entryDate), "dd MMM yyyy")}
        </span>
        <span className="flex-1 text-sm font-medium text-foreground text-left truncate">{entry.description}</span>
        <span className="text-xs text-muted-foreground capitalize shrink-0 w-20">
          {entry.referenceType?.replace("_", " ")}
        </span>
        <span className="text-sm font-bold text-foreground shrink-0 w-24 text-right">
          ₹{Number(entry.totalDebits).toLocaleString("en-IN")}
        </span>
        <div className="shrink-0">
          <StatusBadge status={entry.status} />
        </div>
        {entry.status === "POSTED" && (
          <Button
            variant="ghost" size="icon"
            className="h-6 w-6 text-rose-500 shrink-0"
            onClick={(e) => { e.stopPropagation(); onReverse(entry); }}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </button>

      {/* Expanded lines */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="border-t border-border/30 bg-muted/20 px-4 py-3"
        >
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left font-medium py-1 w-16">Line</th>
                <th className="text-left font-medium py-1 w-20">Code</th>
                <th className="text-left font-medium py-1">Account</th>
                <th className="text-left font-medium py-1 w-40">Narration</th>
                <th className="text-right font-medium py-1 w-28">Debit (₹)</th>
                <th className="text-right font-medium py-1 w-28">Credit (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {entry.lines.map((line) => (
                <tr key={line.lineId} className="hover:bg-muted/30">
                  <td className="py-1.5 text-muted-foreground">{line.lineNumber}</td>
                  <td className="py-1.5 font-mono text-foreground/70">{line.accountCode}</td>
                  <td className="py-1.5 font-medium text-foreground">{line.accountName}</td>
                  <td className="py-1.5 text-muted-foreground truncate max-w-[150px]">{line.narration || "—"}</td>
                  <td className="py-1.5 text-right text-foreground">
                    {Number(line.debitAmount) > 0 ? Number(line.debitAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}
                  </td>
                  <td className="py-1.5 text-right text-foreground">
                    {Number(line.creditAmount) > 0 ? Number(line.creditAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="font-bold border-t-2 border-border/60">
                <td colSpan={4} className="pt-2 text-muted-foreground text-right pr-2">Totals</td>
                <td className="pt-2 text-right text-emerald-700">
                  {Number(entry.totalDebits).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td className="pt-2 text-right text-emerald-700">
                  {Number(entry.totalCredits).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
          {entry.postedBy && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Posted by <strong>{entry.postedBy}</strong> · {entry.createdAt ? format(new Date(entry.createdAt), "dd MMM yyyy, HH:mm") : ""}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ── Manual Entry Dialog ───────────────────────────────────────────────────────

function ManualEntryDialog({
  open,
  onClose,
  onSaved,
  postingAccounts,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  postingAccounts: AccountResponseDTO[];
}) {
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<JournalLineRequestDTO[]>([
    { accountId: 0, debitAmount: 0, creditAmount: 0, narration: "" },
    { accountId: 0, debitAmount: 0, creditAmount: 0, narration: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const totalDebits  = lines.reduce((s, l) => s + (l.debitAmount || 0), 0);
  const totalCredits = lines.reduce((s, l) => s + (l.creditAmount || 0), 0);
  const isBalanced   = Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0;

  const updateLine = (idx: number, field: keyof JournalLineRequestDTO, value: any) => {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const addLine = () => setLines((prev) => [...prev, { accountId: 0, debitAmount: 0, creditAmount: 0, narration: "" }]);
  const removeLine = (idx: number) => { if (lines.length > 2) setLines((prev) => prev.filter((_, i) => i !== idx)); };

  const handleSave = async () => {
    if (!description.trim()) { toast.error("Description is required."); return; }
    if (!isBalanced) { toast.error("Debits must equal Credits before posting."); return; }
    if (lines.some(l => !l.accountId)) { toast.error("All lines must have an account selected."); return; }
    setSaving(true);
    try {
      await glService.createManualEntry({ entryDate, description, lines });
      toast.success("Journal entry posted successfully.");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to post journal entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Manual Journal Entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="je-date">Entry Date *</Label>
              <Input id="je-date" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="je-desc">Description *</Label>
              <Input id="je-desc" placeholder="Purpose of this entry" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          {/* Lines */}
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_100px_100px_1fr_24px] gap-2 text-[10px] text-muted-foreground font-medium px-1">
              <span>Account</span>
              <span className="text-right">Debit (₹)</span>
              <span className="text-right">Credit (₹)</span>
              <span>Narration</span>
              <span />
            </div>
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_100px_100px_1fr_24px] gap-2 items-center">
                <Select
                  value={line.accountId ? String(line.accountId) : ""}
                  onValueChange={(v) => updateLine(idx, "accountId", Number(v))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select account…" /></SelectTrigger>
                  <SelectContent>
                    {postingAccounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.code} — {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number" min={0} step="0.01" placeholder="0.00"
                  className="h-8 text-xs text-right"
                  value={line.debitAmount || ""}
                  onChange={(e) => updateLine(idx, "debitAmount", Number(e.target.value))}
                />
                <Input
                  type="number" min={0} step="0.01" placeholder="0.00"
                  className="h-8 text-xs text-right"
                  value={line.creditAmount || ""}
                  onChange={(e) => updateLine(idx, "creditAmount", Number(e.target.value))}
                />
                <Input
                  className="h-8 text-xs" placeholder="Narration (optional)"
                  value={line.narration ?? ""}
                  onChange={(e) => updateLine(idx, "narration", e.target.value)}
                />
                <Button
                  variant="ghost" size="icon" className="h-6 w-6 text-rose-500/60"
                  onClick={() => removeLine(idx)}
                >✕</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addLine} className="mt-1">
              <Plus className="h-3 w-3 mr-1" /> Add Line
            </Button>
          </div>

          {/* Balance indicator */}
          <div className={`flex items-center gap-2 text-sm p-2.5 rounded-lg font-medium ${
            isBalanced ? "bg-emerald-500/10 text-emerald-700" :
            totalDebits > 0 ? "bg-rose-500/10 text-rose-700" : "bg-muted text-muted-foreground"
          }`}>
            {isBalanced ? (
              <><Scale className="h-4 w-4" /> Balanced — ₹{totalDebits.toLocaleString("en-IN")} each side</>
            ) : (
              <><AlertCircle className="h-4 w-4" /> Out of balance by ₹{Math.abs(totalDebits - totalCredits).toLocaleString("en-IN")}</>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !isBalanced}>
            {saving ? "Posting..." : "Post Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Trial Balance View ────────────────────────────────────────────────────────

function TrialBalanceView() {
  const [rows, setRows] = useState<TrialBalanceRowDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await glService.getTrialBalance();
      setRows(res.data);
    } catch {
      toast.error("Failed to load trial balance.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sumDebits  = rows.reduce((s, r) => s + Number(r.totalDebits), 0);
  const sumCredits = rows.reduce((s, r) => s + Number(r.totalCredits), 0);
  const isBalanced = Math.abs(sumDebits - sumCredits) < 0.01;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-xs font-bold ${isBalanced && rows.length > 0 ? "text-emerald-600 bg-emerald-500/10" : "text-amber-600 bg-amber-500/10"}`}>
            {rows.length > 0 ? (isBalanced ? "✓ BALANCED" : "⚠ NOT BALANCED") : "EMPTY"}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-muted" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No posted journal entries yet. Post some entries first.
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-xs text-muted-foreground">
                <th className="text-left py-2.5 px-4 font-semibold w-16">Code</th>
                <th className="text-left py-2.5 px-4 font-semibold">Account Name</th>
                <th className="text-left py-2.5 px-4 font-semibold w-24">Type</th>
                <th className="text-right py-2.5 px-4 font-semibold w-32">Total Debits</th>
                <th className="text-right py-2.5 px-4 font-semibold w-32">Total Credits</th>
                <th className="text-right py-2.5 px-4 font-semibold w-36">Net Balance</th>
                <th className="text-center py-2.5 px-4 font-semibold w-20">Side</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {rows.map((row) => (
                <tr key={row.accountId} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-4 font-mono text-xs text-foreground/70">{row.accountCode}</td>
                  <td className="py-2.5 px-4 font-medium text-foreground">{row.accountName}</td>
                  <td className="py-2.5 px-4">
                    <Badge variant="outline" className="text-[9px]">{row.accountType}</Badge>
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium">
                    {Number(row.totalDebits) > 0 ? Number(row.totalDebits).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium">
                    {Number(row.totalCredits) > 0 ? Number(row.totalCredits).toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—"}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-foreground">
                    {Number(row.netBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <Badge variant="outline" className={`text-[9px] font-bold ${row.isDebitBalance ? "text-blue-600 bg-blue-500/10" : "text-purple-600 bg-purple-500/10"}`}>
                      {row.isDebitBalance ? "Dr" : "Cr"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/50 border-t-2 border-border/60">
              <tr className="font-bold text-sm">
                <td colSpan={3} className="py-2.5 px-4 text-right text-muted-foreground">TOTALS</td>
                <td className="py-2.5 px-4 text-right text-emerald-700">
                  {sumDebits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 px-4 text-right text-emerald-700">
                  {sumCredits.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td colSpan={2} className={`py-2.5 px-4 text-center text-xs font-bold ${isBalanced ? "text-emerald-600" : "text-rose-600"}`}>
                  {isBalanced ? "✓ Balanced" : `⚠ Diff: ${Math.abs(sumDebits - sumCredits).toFixed(2)}`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function GeneralLedger() {
  const [entries, setEntries] = useState<JournalEntryResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [postingAccounts, setPostingAccounts] = useState<AccountResponseDTO[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("journal");

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesRes, accountsRes] = await Promise.all([
        glService.getJournalEntries({
          status: statusFilter !== "all" ? statusFilter as JournalEntryStatus : undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
          size: 50,
        }),
        coaService.getPostingAccounts(),
      ]);
      setEntries(entriesRes.data.content ?? []);
      setPostingAccounts(accountsRes.data);
    } catch {
      toast.error("Failed to load journal entries.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, fromDate, toDate]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleReverse = async (entry: JournalEntryResponseDTO) => {
    const reason = window.prompt("Reason for reversal (optional):");
    if (reason === null) return; // User cancelled
    try {
      await glService.reverseEntry(entry.id, reason);
      toast.success(`Entry ${entry.entryNumber} reversed successfully.`);
      loadEntries();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to reverse entry.");
    }
  };

  const totalPosted = entries.filter(e => e.status === "POSTED").length;
  const totalValue  = entries.filter(e => e.status === "POSTED").reduce((s, e) => s + Number(e.totalDebits), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-primary" />
            General Ledger
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Double-entry journal entries — the core accounting engine.
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Manual Entry
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50 bg-card/60">
          <CardContent className="pt-3 pb-3">
            <p className="text-xl font-black text-foreground">{totalPosted}</p>
            <p className="text-xs text-muted-foreground font-medium">Posted Entries</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/60">
          <CardContent className="pt-3 pb-3">
            <p className="text-xl font-black text-emerald-600">₹{totalValue.toLocaleString("en-IN")}</p>
            <p className="text-xs text-muted-foreground font-medium">Total Value Posted</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/60">
          <CardContent className="pt-3 pb-3">
            <p className="text-xl font-black text-foreground">{entries.filter(e => e.status === "REVERSED").length}</p>
            <p className="text-xs text-muted-foreground font-medium">Reversed Entries</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-8">
          <TabsTrigger value="journal" className="text-xs h-7">Journal Entries</TabsTrigger>
          <TabsTrigger value="trial" className="text-xs h-7">Trial Balance</TabsTrigger>
        </TabsList>

        <TabsContent value="journal" className="mt-4">
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="POSTED">Posted</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="REVERSED">Reversed</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" className="h-7 w-36 text-xs" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <span className="text-xs text-muted-foreground">to</span>
            <Input type="date" className="h-7 w-36 text-xs" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={loadEntries} disabled={loading}>
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Apply
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-10 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No journal entries found.</p>
              <p className="text-xs text-muted-foreground mt-1">Fee payments will auto-create GL entries once the COA is seeded.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <JournalEntryRow key={entry.id} entry={entry} onReverse={handleReverse} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trial" className="mt-4">
          <TrialBalanceView />
        </TabsContent>
      </Tabs>

      {/* Manual Entry Dialog */}
      <ManualEntryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={loadEntries}
        postingAccounts={postingAccounts}
      />
    </div>
  );
}
