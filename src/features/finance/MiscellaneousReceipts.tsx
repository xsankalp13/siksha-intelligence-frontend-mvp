import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Receipt, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { financeService } from "@/services/finance";
import { coaService } from "@/services/coa";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const INR = (v: number) => `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

export function MiscellaneousReceipts() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  
  // Minimal accounts needed for the dropdown (assuming we'd ideally fetch these from COA)
  const [accounts, setAccounts] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [recRes, accRes] = await Promise.all([
        financeService.getMiscReceipts(),
        coaService.getAll()
      ]);
      setReceipts(recRes.data);
      setAccounts(accRes.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load receipts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const totalCollected = receipts.reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" />Misc Receipts</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Collect and log ad-hoc income directly into the General Ledger.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="h-3.5 w-3.5 mr-1.5" />New Receipt</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border/50 bg-card/60">
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-black text-emerald-600">{INR(totalCollected)}</p>
            <p className="text-xs text-muted-foreground font-medium">Total Misc Income</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading receipts...</div>
        ) : receipts.length === 0 ? (
          <div className="p-16 text-center text-sm text-muted-foreground">No miscellaneous receipts found.</div>
        ) : (
          <div className="text-sm">
            <div className="grid grid-cols-6 gap-2 bg-muted/40 p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>Date</span>
              <span>Number</span>
              <span className="col-span-2">Received From / Desc</span>
              <span>Mode</span>
              <span className="text-right">Amount</span>
            </div>
            <div className="divide-y divide-border/20">
              {receipts.map(r => (
                <div key={r.id} className="grid grid-cols-6 gap-2 p-3 hover:bg-muted/10 items-center">
                  <span className="text-muted-foreground">{format(new Date(r.receiptDate), 'dd MMM yyyy')}</span>
                  <span className="font-mono text-xs">{r.receiptNumber}</span>
                  <div className="col-span-2 leading-tight">
                    <p className="font-semibold">{r.receivedFrom}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                    <p className="text-[9px] text-muted-foreground/70 mt-0.5 mix-blend-multiply bg-primary/5 inline-flex px-1 rounded">Dr {r.depositAccountCode} • Cr {r.incomeAccountCode}</p>
                  </div>
                  <span className="text-xs">{r.paymentMode}{r.referenceNumber ? ` (${r.referenceNumber})` : ''}</span>
                  <span className="text-right font-black text-emerald-600">+{INR(r.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <MiscReceiptForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={loadData} accounts={accounts} />
    </div>
  );
}

function MiscReceiptForm({ open, onClose, onSaved, accounts }: { open: boolean, onClose: () => void, onSaved: () => void, accounts: any[] }) {
  const [form, setForm] = useState({
    receiptDate: format(new Date(), 'yyyy-MM-dd'),
    receivedFrom: '',
    description: '',
    amount: '',
    paymentMode: 'CASH',
    referenceNumber: '',
    incomeAccountId: '',
    depositAccountId: ''
  });
  const [saving, setSaving] = useState(false);

  const incomeAccounts = accounts.filter(a => a.accountType === 'INCOME');
  const assetAccounts = accounts.filter(a => a.accountType === 'ASSET');

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.receivedFrom || !form.amount || !form.incomeAccountId || !form.depositAccountId) {
      toast.error('Please fill required fields.'); return;
    }
    setSaving(true);
    try {
      await financeService.createMiscReceipt({ ...form, amount: Number(form.amount) });
      toast.success("Receipt generated and posted to GL.");
      onSaved();
      onClose();
    } catch(err: any) {
      toast.error(err?.response?.data?.message || "Failed to generate receipt.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Miscellaneous Receipt</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5"><Label>Date *</Label><Input type="date" value={form.receiptDate} onChange={f('receiptDate')} /></div>
          <div className="space-y-1.5"><Label>Amount (₹) *</Label><Input type="number" value={form.amount} onChange={f('amount')} /></div>
          
          <div className="col-span-2 space-y-1.5"><Label>Received From *</Label><Input value={form.receivedFrom} onChange={f('receivedFrom')} placeholder="Name of Person/Org" /></div>
          
          <div className="col-span-2 space-y-1.5"><Label>Description *</Label><Input value={form.description} onChange={f('description')} placeholder="e.g. Broken flask fine, Old PC scrap sale" /></div>

          <div className="space-y-1.5">
            <Label>Income Account (Cr) *</Label>
            <Select value={form.incomeAccountId} onValueChange={v => setForm(p => ({ ...p, incomeAccountId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select Revenue A/c" /></SelectTrigger>
              <SelectContent>
                {incomeAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.code} - {a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Deposit Account (Dr) *</Label>
            <Select value={form.depositAccountId} onValueChange={v => setForm(p => ({ ...p, depositAccountId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select Asset A/c" /></SelectTrigger>
              <SelectContent>
                {assetAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.code} - {a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Payment Mode *</Label>
            <Select value={form.paymentMode} onValueChange={v => setForm(p => ({ ...p, paymentMode: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'DD'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Reference No.</Label><Input value={form.referenceNumber} onChange={f('referenceNumber')} placeholder="UTR / Cheque No." /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Generating...' : 'Generate Receipt'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
