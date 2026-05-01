import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Layers, Plus, RefreshCw, ChevronDown, ChevronRight, Trash2,
  TrendingDown, Search,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  assetService,
  type AssetResponseDTO,
  type AssetStatus,
  type DepreciationMethod,
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

const INR = (v: number) =>
  `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const STATUS_META: Record<AssetStatus, { label: string; color: string; bg: string }> = {
  IN_TRANSIT:        { label: 'In Transit',        color: 'text-sky-600',          bg: 'bg-sky-500/10' },
  ACTIVE:            { label: 'Active',             color: 'text-emerald-600',      bg: 'bg-emerald-500/10' },
  UNDER_MAINTENANCE: { label: 'Maintenance',        color: 'text-amber-600',        bg: 'bg-amber-500/10' },
  DISPOSED:          { label: 'Disposed',           color: 'text-slate-500',        bg: 'bg-slate-500/10' },
  WRITTEN_OFF:       { label: 'Written Off',        color: 'text-rose-600',         bg: 'bg-rose-500/10' },
};

const DEP_METHOD_LABELS: Record<DepreciationMethod, string> = {
  STRAIGHT_LINE:      'SLM',
  WRITTEN_DOWN_VALUE: 'WDV',
  UNITS_OF_PRODUCTION: 'UOP',
};

const CATEGORIES = ['IT Equipment', 'Lab Equipment', 'Furniture', 'Vehicle', 'Building', 'Library Books', 'Scientific Instruments', 'HVAC', 'Generator', 'Other'];

// ── Asset Card ────────────────────────────────────────────────────────────────

function AssetCard({ asset, onDepreciate, onDispose }: {
  asset: AssetResponseDTO;
  onDepreciate: () => void;
  onDispose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const m = STATUS_META[asset.status];
  const depreciationUsedPct = asset.purchaseCost > 0
    ? Math.min(100, (asset.accumulatedDepreciation / asset.purchaseCost) * 100)
    : 0;

  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden hover:border-primary/30 hover:shadow-md transition-all">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-start gap-3 p-4"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Layers className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-foreground">{asset.name}</p>
            <Badge variant="outline" className={`text-[9px] font-bold border-transparent ${m.color} ${m.bg}`}>{m.label}</Badge>
            {asset.assetCategory && (
              <span className="text-[10px] font-semibold text-primary/70 bg-primary/5 rounded px-1.5 py-0.5">{asset.assetCategory}</span>
            )}
          </div>
          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{asset.assetCode}</p>
          {asset.location && <p className="text-xs text-muted-foreground">{asset.location}</p>}

          {/* Depreciation bar */}
          <div className="mt-2.5 space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Book Value: <strong className="text-foreground">{INR(asset.currentBookValue)}</strong></span>
              <span>{DEP_METHOD_LABELS[asset.depreciationMethod]} · {asset.usefulLifeYears}yr</span>
            </div>
            <Progress value={depreciationUsedPct} className="h-1.5" />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Cost: {INR(asset.purchaseCost)}</span>
              <span className="text-rose-500">Dep: {INR(asset.accumulatedDepreciation)} ({depreciationUsedPct.toFixed(0)}%)</span>
            </div>
          </div>
        </div>
        <div className="shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="border-t border-border/30 bg-muted/20 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {asset.serialNumber && <p><span className="text-muted-foreground">Serial:</span> {asset.serialNumber}</p>}
            {asset.make && <p><span className="text-muted-foreground">Make/Model:</span> {asset.make} {asset.model || ''}</p>}
            <p><span className="text-muted-foreground">Purchase Date:</span> {format(new Date(asset.purchaseDate), 'dd MMM yyyy')}</p>
            {asset.inUseDate && <p><span className="text-muted-foreground">In Use From:</span> {format(new Date(asset.inUseDate), 'dd MMM yyyy')}</p>}
            <p><span className="text-muted-foreground">Salvage Value:</span> {INR(asset.salvageValue)}</p>
            {asset.vendorName && <p><span className="text-muted-foreground">Vendor:</span> {asset.vendorName}</p>}
            {asset.lastDepreciationDate && <p><span className="text-muted-foreground">Last Dep:</span> {format(new Date(asset.lastDepreciationDate), 'dd MMM yyyy')}</p>}
          </div>
          {asset.notes && <p className="text-xs text-muted-foreground">{asset.notes}</p>}

          <div className="flex gap-2 pt-1">
            {asset.status === 'ACTIVE' && (
              <Button size="sm" variant="outline" onClick={onDepreciate}>
                <TrendingDown className="h-3.5 w-3.5 mr-1.5 text-amber-500" /> Post Depreciation
              </Button>
            )}
            {(asset.status === 'ACTIVE' || asset.status === 'UNDER_MAINTENANCE') && (
              <Button size="sm" variant="outline" className="text-rose-500" onClick={onDispose}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Dispose
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Depreciation Dialog ───────────────────────────────────────────────────────

function DepreciationDialog({ open, assetId, assetName, onClose, onDone }: {
  open: boolean; assetId: number | null; assetName: string; onClose: () => void; onDone: () => void;
}) {
  const thisYear = new Date().getFullYear();
  const [fy, setFy] = useState(`${thisYear}-${thisYear + 1}`);
  const [loading, setLoading] = useState(false);
  const handlePost = async () => {
    if (!assetId) return;
    setLoading(true);
    try {
      await assetService.depreciate(assetId, fy);
      toast.success(`Depreciation posted for ${assetName} — FY ${fy}`);
      onDone(); onClose();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Failed to post depreciation.'); }
    finally { setLoading(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Post Depreciation</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm font-medium">{assetName}</p>
          <Label>Financial Year</Label>
          <Input value={fy} onChange={e => setFy(e.target.value)} placeholder="2025-2026" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handlePost} disabled={loading}>{loading ? 'Posting…' : 'Post Depreciation + GL'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Asset Form Dialog ─────────────────────────────────────────────────────────

function AssetFormDialog({ open, onClose, onSaved, editing }: {
  open: boolean; onClose: () => void; onSaved: () => void; editing: AssetResponseDTO | null;
}) {
  const EMPTY = {
    name: '', assetCategory: '', location: '', description: '', make: '', model: '',
    serialNumber: '', purchaseDate: format(new Date(), 'yyyy-MM-dd'), inUseDate: '',
    purchaseCost: '', salvageValue: '', usefulLifeYears: '5',
    depreciationMethod: 'STRAIGHT_LINE' as DepreciationMethod, notes: '',
    status: 'IN_TRANSIT' as AssetStatus,
  };
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name, assetCategory: editing.assetCategory ?? '',
        location: editing.location ?? '', description: editing.description ?? '',
        make: editing.make ?? '', model: editing.model ?? '',
        serialNumber: editing.serialNumber ?? '', purchaseDate: editing.purchaseDate,
        inUseDate: editing.inUseDate ?? '', purchaseCost: String(editing.purchaseCost),
        salvageValue: String(editing.salvageValue), usefulLifeYears: String(editing.usefulLifeYears),
        depreciationMethod: editing.depreciationMethod, notes: editing.notes ?? '',
        status: editing.status,
      });
    } else { setForm({ ...EMPTY }); }
  }, [editing, open]);

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name || !form.purchaseCost) { toast.error('Name and purchase cost are required.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, purchaseCost: Number(form.purchaseCost), salvageValue: Number(form.salvageValue) || 0, usefulLifeYears: Number(form.usefulLifeYears), inUseDate: form.inUseDate || undefined };
      if (editing) { await assetService.update(editing.id, payload); toast.success('Asset updated.'); }
      else { await assetService.create(payload); toast.success('Asset registered.'); }
      onSaved(); onClose();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Save failed.'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? 'Edit Asset' : 'Register Fixed Asset'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5"><Label>Asset Name *</Label><Input value={form.name} onChange={f('name')} /></div>
            <div className="space-y-1.5"><Label>Category</Label>
              <Select value={form.assetCategory} onValueChange={v => setForm(p => ({ ...p, assetCategory: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category…" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Location / Department</Label><Input value={form.location} onChange={f('location')} /></div>
            <div className="space-y-1.5"><Label>Make</Label><Input value={form.make} onChange={f('make')} /></div>
            <div className="space-y-1.5"><Label>Model</Label><Input value={form.model} onChange={f('model')} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Serial Number</Label><Input value={form.serialNumber} onChange={f('serialNumber')} /></div>
            <div className="space-y-1.5"><Label>Purchase Date *</Label><Input type="date" value={form.purchaseDate} onChange={f('purchaseDate')} /></div>
            <div className="space-y-1.5"><Label>In-Use Date</Label><Input type="date" value={form.inUseDate} onChange={f('inUseDate')} /></div>
            <div className="space-y-1.5"><Label>Purchase Cost (₹) *</Label><Input type="number" min={0} value={form.purchaseCost} onChange={f('purchaseCost')} /></div>
            <div className="space-y-1.5"><Label>Salvage Value (₹)</Label><Input type="number" min={0} value={form.salvageValue} onChange={f('salvageValue')} /></div>
            <div className="space-y-1.5"><Label>Useful Life (years)</Label><Input type="number" min={1} value={form.usefulLifeYears} onChange={f('usefulLifeYears')} /></div>
            <div className="space-y-1.5"><Label>Depreciation Method</Label>
              <Select value={form.depreciationMethod} onValueChange={v => setForm(p => ({ ...p, depreciationMethod: v as DepreciationMethod }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STRAIGHT_LINE">Straight Line (SLM)</SelectItem>
                  <SelectItem value="WRITTEN_DOWN_VALUE">Written Down Value (WDV)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as AssetStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(STATUS_META) as AssetStatus[]).map(s => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Description / Notes</Label><Textarea rows={2} value={form.notes} onChange={f('notes')} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Register Asset'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AssetRegister() {
  const [assets, setAssets] = useState<AssetResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AssetResponseDTO | null>(null);
  const [depreciating, setDepreciating] = useState<AssetResponseDTO | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await assetService.getAll(); setAssets(r.data); }
    catch { toast.error('Failed to load assets.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = assets.filter(a => {
    const q = search.toLowerCase();
    return (!q || a.name.toLowerCase().includes(q) || a.assetCode.toLowerCase().includes(q) || (a.assetCategory?.toLowerCase().includes(q))) &&
      (statusFilter === 'all' || a.status === statusFilter);
  });

  const grossCost = assets.reduce((s, a) => s + Number(a.purchaseCost), 0);
  const bookValue = assets.filter(a => a.status === 'ACTIVE').reduce((s, a) => s + Number(a.currentBookValue), 0);
  const activeCount = assets.filter(a => a.status === 'ACTIVE').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Layers className="h-5 w-5 text-primary" />Fixed Asset Register</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{assets.length} assets · {activeCount} active</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-3.5 w-3.5 mr-1.5" />Register Asset</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Assets', value: assets.length, color: 'text-foreground' },
          { label: 'Gross Cost', value: INR(grossCost), color: 'text-foreground' },
          { label: 'Net Book Value (Active)', value: INR(bookValue), color: 'text-primary font-black' },
        ].map(k => (
          <Card key={k.label} className="border-border/50 bg-card/60">
            <CardContent className="pt-3 pb-3"><p className={`text-xl font-black ${k.color}`}>{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8 h-7 text-xs" placeholder="Search name, code, category…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {(Object.keys(STATUS_META) as AssetStatus[]).map(s => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center"><Layers className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No assets found. Register your first fixed asset.</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <AssetCard key={a.id} asset={a}
              onDepreciate={() => setDepreciating(a)}
              onDispose={async () => {
                if (!confirm(`Dispose "${a.name}"?`)) return;
                try { await assetService.dispose(a.id, format(new Date(), 'yyyy-MM-dd'), 'Disposed', 0); toast.success('Asset disposed.'); load(); }
                catch (err: any) { toast.error(err?.response?.data?.message ?? 'Failed.'); }
              }}
            />
          ))}
        </div>
      )}

      <AssetFormDialog open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} editing={editing} />
      <DepreciationDialog open={!!depreciating} assetId={depreciating?.id ?? null} assetName={depreciating?.name ?? ''} onClose={() => setDepreciating(null)} onDone={load} />
    </div>
  );
}
