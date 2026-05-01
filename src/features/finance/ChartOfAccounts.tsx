import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight, ChevronDown, Plus, Pencil, Trash2,
  RefreshCw, BookOpen, Sparkles, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  coaService,
  type AccountResponseDTO,
  type AccountRequestDTO,
  type AccountType,
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

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCOUNT_TYPE_META: Record<AccountType, { label: string; color: string; bg: string }> = {
  ASSET:     { label: "Asset",     color: "text-blue-600",   bg: "bg-blue-500/10" },
  LIABILITY: { label: "Liability", color: "text-rose-600",   bg: "bg-rose-500/10" },
  EQUITY:    { label: "Equity",    color: "text-violet-600", bg: "bg-violet-500/10" },
  INCOME:    { label: "Income",    color: "text-emerald-600", bg: "bg-emerald-500/10" },
  EXPENSE:   { label: "Expense",   color: "text-amber-600",  bg: "bg-amber-500/10" },
};

const ACCOUNT_TYPES: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];

// ── AccountNode (recursive tree row) ─────────────────────────────────────────

function AccountNode({
  account,
  depth,
  allAccounts,
  onEdit,
  onDeactivate,
}: {
  account: AccountResponseDTO;
  depth: number;
  allAccounts: AccountResponseDTO[];
  onEdit: (a: AccountResponseDTO) => void;
  onDeactivate: (a: AccountResponseDTO) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = account.children && account.children.length > 0;
  const meta = ACCOUNT_TYPE_META[account.accountType];

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        className={`group flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/40 transition-colors
          ${!account.active ? "opacity-50" : ""}`}
        style={{ paddingLeft: `${8 + depth * 20}px` }}
      >
        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-4 h-4 flex items-center justify-center text-muted-foreground shrink-0"
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
          ) : (
            <span className="w-3" />
          )}
        </button>

        {/* Account code badge */}
        <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
          {account.code}
        </span>

        {/* Name */}
        <span className={`flex-1 text-sm font-medium ${account.postingAccount ? "text-foreground" : "text-foreground/70 font-semibold"}`}>
          {account.name}
        </span>

        {/* Type badge */}
        <Badge
          variant="outline"
          className={`text-[9px] font-bold px-1.5 py-0 h-4 ${meta.color} border-current/20 ${meta.bg} shrink-0`}
        >
          {meta.label}
        </Badge>

        {/* Balance */}
        {account.postingAccount && (
          <span className="text-xs font-bold text-foreground/70 w-20 text-right shrink-0">
            ₹{Number(account.balance).toLocaleString("en-IN")}
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            variant="ghost" size="icon"
            className="h-6 w-6"
            onClick={() => onEdit(account)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          {account.active && (
            <Button
              variant="ghost" size="icon"
              className="h-6 w-6 text-rose-500"
              onClick={() => onDeactivate(account)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </motion.div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {account.children
            .slice()
            .sort((a, b) => a.code.localeCompare(b.code))
            .map((child) => (
              <AccountNode
                key={child.id}
                account={child}
                depth={depth + 1}
                allAccounts={allAccounts}
                onEdit={onEdit}
                onDeactivate={onDeactivate}
              />
            ))}
        </div>
      )}
    </div>
  );
}

// ── AccountFormDialog ─────────────────────────────────────────────────────────

function AccountFormDialog({
  open,
  onClose,
  onSaved,
  editing,
  postingAccounts,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: AccountResponseDTO | null;
  postingAccounts: AccountResponseDTO[];
}) {
  const [form, setForm] = useState<AccountRequestDTO>({
    code: "",
    name: "",
    accountType: "ASSET",
    parentAccountId: null,
    description: "",
    postingAccount: true,
    active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        code: editing.code,
        name: editing.name,
        accountType: editing.accountType,
        parentAccountId: editing.parentAccountId,
        description: editing.description ?? "",
        postingAccount: editing.postingAccount,
        active: editing.active,
      });
    } else {
      setForm({ code: "", name: "", accountType: "ASSET", parentAccountId: null, description: "", postingAccount: true, active: true });
    }
  }, [editing, open]);

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and Name are required.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await coaService.update(editing.id, form);
        toast.success("Account updated.");
      } else {
        await coaService.create(form);
        toast.success("Account created.");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Account" : "Create Account"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="coa-code">Account Code *</Label>
              <Input id="coa-code" placeholder="e.g. 4110" maxLength={20}
                value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="coa-type">Account Type *</Label>
              <Select value={form.accountType} onValueChange={(v) => setForm({ ...form, accountType: v as AccountType })}>
                <SelectTrigger id="coa-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{ACCOUNT_TYPE_META[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coa-name">Account Name *</Label>
            <Input id="coa-name" placeholder="e.g. Tuition Fee Revenue" maxLength={150}
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coa-parent">Parent Account (optional)</Label>
            <Select
              value={form.parentAccountId?.toString() ?? "none"}
              onValueChange={(v) => setForm({ ...form, parentAccountId: v === "none" ? null : Number(v) })}
            >
              <SelectTrigger id="coa-parent"><SelectValue placeholder="Root level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Root Level —</SelectItem>
                {postingAccounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>{a.code} — {a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="coa-desc">Description</Label>
            <Input id="coa-desc" placeholder="Optional usage notes"
              value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.postingAccount}
                onChange={(e) => setForm({ ...form, postingAccount: e.target.checked })} />
              Posting Account
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Active
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editing ? "Save Changes" : "Create Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ChartOfAccounts() {
  const [tree, setTree] = useState<AccountResponseDTO[]>([]);
  const [allAccounts, setAllAccounts] = useState<AccountResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AccountResponseDTO | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [treeRes, allRes] = await Promise.all([
        coaService.getTree(),
        coaService.getAll(),
      ]);
      setTree(treeRes.data);
      setAllAccounts(allRes.data);
    } catch {
      toast.error("Failed to load Chart of Accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSeedDefault = async () => {
    setSeeding(true);
    try {
      await coaService.seedDefault();
      toast.success("Default COA seeded successfully! 45 accounts created.");
      load();
    } catch {
      toast.error("Failed to seed default COA.");
    } finally {
      setSeeding(false);
    }
  };

  const handleDeactivate = async (account: AccountResponseDTO) => {
    if (!confirm(`Deactivate account "${account.name}"?`)) return;
    try {
      await coaService.deactivate(account.id);
      toast.success("Account deactivated.");
      load();
    } catch {
      toast.error("Failed to deactivate account.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Chart of Accounts
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Multi-level account hierarchy for double-entry bookkeeping.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {tree.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleSeedDefault} disabled={seeding}>
              <Sparkles className={`h-3.5 w-3.5 mr-1.5 ${seeding ? "animate-spin" : ""}`} />
              {seeding ? "Seeding..." : "Seed Default COA"}
            </Button>
          )}
          <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      {allAccounts.length > 0 && (
        <div className="grid grid-cols-5 gap-3">
          {ACCOUNT_TYPES.map((type) => {
            const count = allAccounts.filter(a => a.accountType === type).length;
            const meta = ACCOUNT_TYPE_META[type];
            return (
              <Card key={type} className="border-border/50 bg-card/60">
                <CardContent className="pt-3 pb-3">
                  <p className={`text-lg font-black ${meta.color}`}>{count}</p>
                  <p className="text-xs text-muted-foreground font-medium">{meta.label} Accounts</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tree */}
      <Card className="border-border/50 bg-card/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Account Tree</CardTitle>
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              <span>Code</span>
              <span>Name</span>
              <span>Type</span>
              <span className="w-20 text-right">Balance (₹)</span>
              <span className="w-12" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" style={{ marginLeft: `${(i % 3) * 20}px` }} />
              ))}
            </div>
          ) : tree.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">No accounts configured yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click <strong>Seed Default COA</strong> to auto-create 45 standard accounts for Indian educational institutions.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {tree.map((root) => (
                <AccountNode
                  key={root.id}
                  account={root}
                  depth={0}
                  allAccounts={allAccounts}
                  onEdit={(a) => { setEditing(a); setDialogOpen(true); }}
                  onDeactivate={handleDeactivate}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <AccountFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
        editing={editing}
        postingAccounts={allAccounts}
      />
    </div>
  );
}
