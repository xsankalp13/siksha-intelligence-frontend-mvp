import { useState, useEffect, useCallback } from 'react';
import { format, differenceInDays } from 'date-fns';
import {
  Award, Plus, RefreshCw, ChevronDown, ChevronRight, AlertTriangle,
  CheckCircle, XCircle, Clock, Zap, PlusCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  grantService,
  type GrantResponseDTO,
  type GrantStatus,
  type GrantUtilizationResponseDTO,
} from '@/services/assets';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';

const INR = (v: number) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const STATUS_META: Record<GrantStatus, { label: string; color: string; bg: string }> = {
  APPLIED:           { label: 'Applied',           color: 'text-blue-600',    bg: 'bg-blue-500/10' },
  SANCTIONED:        { label: 'Sanctioned',         color: 'text-purple-600',  bg: 'bg-purple-500/10' },
  ACTIVE:            { label: 'Active',             color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  PARTIALLY_UTILISED:{ label: 'Partially Utilised', color: 'text-amber-600',   bg: 'bg-amber-500/10' },
  FULLY_UTILISED:    { label: 'Fully Utilised',     color: 'text-teal-600',    bg: 'bg-teal-500/10' },
  CLOSED:            { label: 'Closed',             color: 'text-slate-500',   bg: 'bg-slate-500/10' },
  LAPSED:            { label: 'Lapsed',             color: 'text-rose-600',    bg: 'bg-rose-500/10' },
};

const EXP_CATEGORIES = ['Equipment', 'Manpower', 'Travel', 'Consumables', 'Books & Journals', 'Software', 'Overhead', 'Contingency', 'Other'];

// ── Grant Card ────────────────────────────────────────────────────────────────

function GrantCard({ grant, onRefresh }: { grant: GrantResponseDTO; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing] = useState(false);
  const [utilOpen, setUtilOpen] = useState(false);
  const m = STATUS_META[grant.status];

  const daysLeft = grant.endDate ? differenceInDays(new Date(grant.endDate), new Date()) : null;

  const doAction = async (fn: () => Promise<any>, msg: string) => {
    setActing(true);
    try { await fn(); toast.success(msg); onRefresh(); }
    catch (err: any) { toast.error(err?.response?.data?.message ?? 'Action failed.'); }
    finally { setActing(false); }
  };

  const utilColour = grant.utilisationPct >= 90 ? 'bg-rose-500' : grant.utilisationPct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className={`rounded-2xl border bg-card/60 overflow-hidden transition-all ${grant.nearingExpiry ? 'border-amber-500/40' : grant.complianceOverdue ? 'border-rose-500/40' : 'border-border/40'} hover:shadow-md hover:border-primary/30`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold truncate">{grant.grantTitle}</p>
              <Badge variant="outline" className={`text-[9px] font-bold border-transparent shrink-0 ${m.color} ${m.bg}`}>{m.label}</Badge>
              {grant.nearingExpiry && <Badge variant="outline" className="text-[9px] font-bold border-transparent text-amber-600 bg-amber-500/10 shrink-0"><AlertTriangle className="h-2.5 w-2.5 mr-0.5" />Expiring</Badge>}
              {grant.complianceOverdue && <Badge variant="outline" className="text-[9px] font-bold border-transparent text-rose-600 bg-rose-500/10 shrink-0">Compliance Due</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{grant.grantingAgency}{grant.grantReference ? ` · ${grant.grantReference}` : ''}</p>
            {grant.principalInvestigator && <p className="text-[10px] text-muted-foreground">PI: {grant.principalInvestigator}</p>}
          </div>
          <div className="text-right shrink-0 ml-3">
            <p className="text-base font-black">{INR(grant.sanctionedAmount)}</p>
            <p className="text-[10px] text-muted-foreground">Sanctioned</p>
            {daysLeft !== null && daysLeft > 0 && <p className="text-[10px] text-muted-foreground">{daysLeft}d left</p>}
          </div>
        </div>

        {/* Utilisation bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Utilised: <strong className="text-foreground">{INR(grant.utilisedAmount)}</strong></span>
            <span>Available: <strong className={grant.availableBalance > 0 ? 'text-emerald-600' : 'text-rose-600'}>{INR(grant.availableBalance)}</strong></span>
            <span className="font-bold">{grant.utilisationPct.toFixed(1)}%</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div className={`absolute inset-y-0 left-0 ${utilColour} rounded-full transition-all`} style={{ width: `${Math.min(100, grant.utilisationPct)}%` }} />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/30 bg-muted/10 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            {grant.startDate && <p><span className="text-muted-foreground">Start:</span> {format(new Date(grant.startDate), 'dd MMM yyyy')}</p>}
            {grant.endDate && <p><span className="text-muted-foreground">End:</span> {format(new Date(grant.endDate), 'dd MMM yyyy')}</p>}
            {grant.complianceDueDate && <p><span className="text-muted-foreground">Compliance Due:</span> {format(new Date(grant.complianceDueDate), 'dd MMM yyyy')}</p>}
            {grant.department && <p><span className="text-muted-foreground">Dept:</span> {grant.department}</p>}
            <p><span className="text-muted-foreground">Received:</span> {INR(grant.receivedAmount)}</p>
          </div>
          {grant.objectives && <p className="text-xs text-muted-foreground">{grant.objectives}</p>}

          {/* Utilisation history */}
          {grant.utilisations.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Utilisation History</p>
              <div className="space-y-1">
                {grant.utilisations.map(u => (
                  <div key={u.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-border/20">
                    <span className="text-muted-foreground w-20 shrink-0">{format(new Date(u.utilisationDate), 'dd MMM yyyy')}</span>
                    <span className="flex-1 truncate">{u.description}</span>
                    {u.expenseCategory && <span className="text-[10px] bg-primary/5 text-primary/70 rounded px-1.5">{u.expenseCategory}</span>}
                    <span className="font-bold text-rose-600 shrink-0">−{INR(u.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {(grant.status === 'ACTIVE' || grant.status === 'PARTIALLY_UTILISED') && (
              <Button size="sm" onClick={() => setUtilOpen(true)} disabled={acting}>
                <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Record Utilisation
              </Button>
            )}
            {grant.status === 'SANCTIONED' && (
              <Button size="sm" variant="outline" onClick={() => doAction(() => grantService.activate(grant.id), 'Grant activated!')} disabled={acting}>
                <Zap className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> Activate Grant
              </Button>
            )}
            {(grant.status === 'FULLY_UTILISED' || grant.status === 'PARTIALLY_UTILISED') && (
              <Button size="sm" variant="outline" onClick={() => doAction(() => grantService.close(grant.id), 'Grant closed.')} disabled={acting}>
                <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-teal-500" /> Close Grant
              </Button>
            )}
            {grant.status === 'ACTIVE' && (
              <Button size="sm" variant="ghost" className="text-rose-500" onClick={() => doAction(() => grantService.lapse(grant.id), 'Grant lapsed.')} disabled={acting}>
                <XCircle className="h-3.5 w-3.5 mr-1.5" /> Mark Lapsed
              </Button>
            )}
          </div>
        </div>
      )}

      <UtilisationDialog open={utilOpen} onClose={() => setUtilOpen(false)} grant={grant} onSaved={onRefresh} />
    </div>
  );
}

// ── Utilisation Dialog ────────────────────────────────────────────────────────

function UtilisationDialog({ open, onClose, grant, onSaved }: {
  open: boolean; onClose: () => void; grant: GrantResponseDTO; onSaved: () => void;
}) {
  const [form, setForm] = useState({ utilisationDate: format(new Date(), 'yyyy-MM-dd'), description: '', expenseCategory: '', amount: '', referenceDocument: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const handleSave = async () => {
    if (!form.description || !form.amount) { toast.error('Description and amount required.'); return; }
    setSaving(true);
    try {
      await grantService.recordUtilisation({ grantId: grant.id, ...form, amount: Number(form.amount) });
      toast.success(`₹${Number(form.amount).toLocaleString('en-IN')} utilised from ${grant.grantTitle}`);
      onSaved(); onClose();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Failed.'); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Utilisation</DialogTitle>
          <p className="text-xs text-muted-foreground">{grant.grantTitle} · Available: {INR(grant.availableBalance)}</p>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2 space-y-1.5"><Label>Description *</Label><Input value={form.description} onChange={f('description')} /></div>
          <div className="space-y-1.5"><Label>Date *</Label><Input type="date" value={form.utilisationDate} onChange={f('utilisationDate')} /></div>
          <div className="space-y-1.5"><Label>Amount (₹) *</Label><Input type="number" min={0} max={grant.availableBalance} value={form.amount} onChange={f('amount')} /></div>
          <div className="space-y-1.5"><Label>Expense Category</Label>
            <Select value={form.expenseCategory} onValueChange={v => setForm(p => ({ ...p, expenseCategory: v }))}>
              <SelectTrigger><SelectValue placeholder="Category…" /></SelectTrigger>
              <SelectContent>{EXP_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Ref Document</Label><Input value={form.referenceDocument} onChange={f('referenceDocument')} placeholder="INV-001, BILL-2025-…" /></div>
          <div className="col-span-2 space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={f('notes')} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Record Utilisation'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Grant Form Dialog ─────────────────────────────────────────────────────────

function GrantFormDialog({ open, onClose, onSaved, editing }: {
  open: boolean; onClose: () => void; onSaved: () => void; editing: GrantResponseDTO | null;
}) {
  const EMPTY = { grantingAgency: '', grantTitle: '', grantReference: '', principalInvestigator: '', department: '', sanctionedAmount: '', receivedAmount: '', startDate: '', endDate: '', complianceDueDate: '', status: 'APPLIED' as GrantStatus, objectives: '', notes: '' };
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (editing) {
      setForm({ grantingAgency: editing.grantingAgency, grantTitle: editing.grantTitle, grantReference: editing.grantReference ?? '', principalInvestigator: editing.principalInvestigator ?? '', department: editing.department ?? '', sanctionedAmount: String(editing.sanctionedAmount), receivedAmount: String(editing.receivedAmount), startDate: editing.startDate ?? '', endDate: editing.endDate ?? '', complianceDueDate: editing.complianceDueDate ?? '', status: editing.status, objectives: editing.objectives ?? '', notes: editing.notes ?? '' });
    } else { setForm({ ...EMPTY }); }
  }, [editing, open]);
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const handleSave = async () => {
    if (!form.grantingAgency || !form.grantTitle || !form.sanctionedAmount) { toast.error('Agency, title and sanctioned amount required.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, sanctionedAmount: Number(form.sanctionedAmount), receivedAmount: Number(form.receivedAmount) || 0, startDate: form.startDate || undefined, endDate: form.endDate || undefined, complianceDueDate: form.complianceDueDate || undefined };
      if (editing) { await grantService.update(editing.id, payload); toast.success('Grant updated.'); }
      else { await grantService.create(payload); toast.success('Grant created.'); }
      onSaved(); onClose();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Failed.'); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? 'Edit Grant' : 'Add New Grant'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5"><Label>Grant Title *</Label><Input value={form.grantTitle} onChange={f('grantTitle')} /></div>
            <div className="space-y-1.5"><Label>Granting Agency *</Label><Input value={form.grantingAgency} onChange={f('grantingAgency')} placeholder="AICTE, DBT, DST…" /></div>
            <div className="space-y-1.5"><Label>Reference / Scheme Code</Label><Input value={form.grantReference} onChange={f('grantReference')} /></div>
            <div className="space-y-1.5"><Label>Principal Investigator</Label><Input value={form.principalInvestigator} onChange={f('principalInvestigator')} /></div>
            <div className="space-y-1.5"><Label>Department</Label><Input value={form.department} onChange={f('department')} /></div>
            <div className="space-y-1.5"><Label>Sanctioned Amount (₹) *</Label><Input type="number" min={0} value={form.sanctionedAmount} onChange={f('sanctionedAmount')} /></div>
            <div className="space-y-1.5"><Label>Received Amount (₹)</Label><Input type="number" min={0} value={form.receivedAmount} onChange={f('receivedAmount')} /></div>
            <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={f('startDate')} /></div>
            <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={form.endDate} onChange={f('endDate')} /></div>
            <div className="space-y-1.5"><Label>Compliance Due Date</Label><Input type="date" value={form.complianceDueDate} onChange={f('complianceDueDate')} /></div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as GrantStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(STATUS_META) as GrantStatus[]).map(s => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Objectives</Label><Textarea rows={3} value={form.objectives} onChange={f('objectives')} placeholder="Research objectives, expected outcomes…" /></div>
          <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={f('notes')} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Grant'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function GrantManager() {
  const [grants, setGrants] = useState<GrantResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<GrantStatus | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GrantResponseDTO | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await grantService.getAll(); setGrants(r.data); }
    catch { toast.error('Failed to load grants.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = grants.filter(g => statusFilter === 'all' || g.status === statusFilter);
  const totalSanctioned = grants.filter(g => ['ACTIVE', 'PARTIALLY_UTILISED', 'FULLY_UTILISED'].includes(g.status)).reduce((s, g) => s + Number(g.sanctionedAmount), 0);
  const totalUtilised = grants.reduce((s, g) => s + Number(g.utilisedAmount), 0);
  const expiring = grants.filter(g => g.nearingExpiry).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Award className="h-5 w-5 text-primary" />Grant Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{grants.length} grants · {expiring > 0 ? `${expiring} expiring soon` : 'All on track'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-3.5 w-3.5 mr-1.5" />Add Grant</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Grants', value: grants.length, color: 'text-foreground' },
          { label: 'Active Sanctioned', value: INR(totalSanctioned), color: 'text-primary' },
          { label: 'Total Utilised', value: INR(totalUtilised), color: 'text-foreground' },
          { label: 'Expiring in 90 days', value: expiring, color: expiring > 0 ? 'text-amber-600' : 'text-foreground' },
        ].map(k => (
          <Card key={k.label} className="border-border/50 bg-card/60">
            <CardContent className="pt-3 pb-3"><p className={`text-xl font-black ${k.color}`}>{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as GrantStatus | 'all')}>
          <SelectTrigger className="h-7 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {(Object.keys(STATUS_META) as GrantStatus[]).map(s => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center"><Award className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No grants found. Add your first grant to start tracking.</p></div>
      ) : (
        <div className="space-y-3">{filtered.map(g => <GrantCard key={g.id} grant={g} onRefresh={load} />)}</div>
      )}

      <GrantFormDialog open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} editing={editing} />
    </div>
  );
}
