import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  Receipt, RefreshCw, Plus, AlertCircle, CheckCircle, XCircle, CreditCard, RotateCcw, Filter,
} from "lucide-react";
import { toast } from "sonner";
import {
  apService, vendorService, poService,
  type VendorBillResponseDTO, type VendorResponseDTO, type PurchaseOrderResponseDTO, type VendorBillStatus,
} from "@/services/procurement";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const INR = (v: number) => `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const STATUS_META: Record<VendorBillStatus, { label: string; color: string; bg: string; icon: any }> = {
  PENDING:              { label: "Pending Match",      color: "text-slate-600",   bg: "bg-slate-500/10",   icon: AlertCircle },
  THREE_WAY_MATCHED:    { label: "3-Way Matched ✓",    color: "text-emerald-600", bg: "bg-emerald-500/10", icon: CheckCircle },
  MISMATCH:             { label: "Mismatch ✗",         color: "text-rose-600",    bg: "bg-rose-500/10",    icon: XCircle },
  APPROVED_FOR_PAYMENT: { label: "Approved for Pay",   color: "text-blue-600",    bg: "bg-blue-500/10",    icon: CreditCard },
  PAID:                 { label: "Paid",               color: "text-teal-600",    bg: "bg-teal-500/10",    icon: CheckCircle },
  CANCELLED:            { label: "Cancelled",          color: "text-muted-foreground", bg: "bg-muted",     icon: XCircle },
};

// ── Bill Card ─────────────────────────────────────────────────────────────────

function BillCard({ bill, onAction }: { bill: VendorBillResponseDTO; onAction: () => void }) {
  const m = STATUS_META[bill.status];
  const Icon = m.icon;
  const [acting, setActing] = useState(false);
  const [payRef, setPayRef] = useState("");
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [expanded, setExpanded] = useState(false);

  const doAction = async (fn: () => Promise<any>, msg: string) => {
    setActing(true);
    try { await fn(); toast.success(msg); onAction(); }
    catch (err: any) { toast.error(err?.response?.data?.message ?? "Action failed."); }
    finally { setActing(false); }
  };

  return (
    <div className={`rounded-2xl border bg-card/60 p-4 transition-all space-y-3 ${bill.overdue ? "border-rose-500/40" : "border-border/40"}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground">{bill.billNumber}</p>
            {bill.overdue && <Badge variant="outline" className="text-[9px] font-bold border-transparent text-rose-600 bg-rose-500/10">OVERDUE</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">{bill.vendorName} · #{bill.vendorInvoiceNumber}</p>
          {bill.poNumber && <p className="text-[10px] text-muted-foreground/70">PO: {bill.poNumber}</p>}
        </div>
        <div className="text-right">
          <p className="text-base font-black text-foreground">{INR(bill.totalPayable)}</p>
          <p className="text-[10px] text-muted-foreground">{format(new Date(bill.billDate), "dd MMM yyyy")}</p>
          {bill.dueDate && <p className="text-[10px] text-muted-foreground">Due: {format(new Date(bill.dueDate), "dd MMM yyyy")}</p>}
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`text-[9px] font-bold border-transparent flex items-center gap-1 ${m.color} ${m.bg}`}>
          <Icon className="h-2.5 w-2.5" />{m.label}
        </Badge>
        {bill.matchedBy && <span className="text-[10px] text-muted-foreground">by {bill.matchedBy}</span>}
      </div>

      {/* 3-Way Match Details */}
      {bill.matchResultNotes && (
        <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
          <div className={`text-[10px] rounded-lg p-2 font-mono whitespace-pre-wrap leading-relaxed ${bill.status === "MISMATCH" ? "bg-rose-500/5 text-rose-700 border border-rose-500/20" : "bg-emerald-500/5 text-emerald-700 border border-emerald-500/20"}`}>
            {expanded ? bill.matchResultNotes : bill.matchResultNotes.split("\n")[0] + "…"}
          </div>
        </button>
      )}

      {bill.paymentDate && (
        <p className="text-[10px] text-teal-600 font-medium">
          Paid on {format(new Date(bill.paymentDate), "dd MMM yyyy")}
          {bill.paymentReference ? ` · Ref: ${bill.paymentReference}` : ""}
          {bill.glEntryId ? ` · GL #${bill.glEntryId}` : ""}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {bill.status === "THREE_WAY_MATCHED" && (
          <Button size="sm" onClick={() => doAction(() => apService.approvePayment(bill.id), "Approved for payment!")} disabled={acting}>
            <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Approve Payment
          </Button>
        )}
        {bill.status === "APPROVED_FOR_PAYMENT" && (
          <Button size="sm" onClick={() => setPayDialogOpen(true)} disabled={acting}>
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Record Payment
          </Button>
        )}
        {bill.status === "MISMATCH" && (
          <Button size="sm" variant="outline" onClick={() => { setOverrideReason(""); setOverrideDialogOpen(true); }} disabled={acting}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-amber-500" /> Override Mismatch
          </Button>
        )}
        {bill.status !== "PAID" && bill.status !== "CANCELLED" && (
          <Button size="sm" variant="ghost" className="text-rose-500" onClick={() => doAction(() => apService.cancel(bill.id), "Bill cancelled.")} disabled={acting}>
            Cancel
          </Button>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle><DialogDescription>Mark this bill as paid and post GL entry.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm font-bold">{INR(bill.totalPayable)} → {bill.vendorName}</p>
            <Label htmlFor="pay-ref">Payment Reference (UTR / Cheque No.)</Label>
            <Input id="pay-ref" value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="e.g. UTR123456789" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => doAction(() => apService.recordPayment(bill.id, payRef), "Payment recorded & GL posted!")}>Confirm Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Dialog */}
      <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Override 3-Way Mismatch</DialogTitle><DialogDescription>Provide justification for overriding the failed match check.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="override-reason">Reason *</Label>
            <Textarea id="override-reason" rows={3} value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="e.g. Pricing difference pre-approved in revision order #PO-2025-00123" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>Cancel</Button>
            <Button disabled={!overrideReason.trim()}
              onClick={() => doAction(() => apService.overrideMismatch(bill.id, overrideReason), "Mismatch overridden — bill is now THREE_WAY_MATCHED.")}>
              Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Create Bill Dialog ────────────────────────────────────────────────────────

function CreateBillDialog({ open, onClose, onSaved, vendors, pos }: {
  open: boolean; onClose: () => void; onSaved: () => void;
  vendors: VendorResponseDTO[]; pos: PurchaseOrderResponseDTO[];
}) {
  const [vendorId, setVendorId] = useState("");
  const [poId, setPoId] = useState("");
  const [invoiceNum, setInvoiceNum] = useState("");
  const [billDate, setBillDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState("");
  const [amount, setAmount] = useState("");
  const [tax, setTax] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const vendorPOs = pos.filter(p => p.vendorId === Number(vendorId) && (p.status === "FULLY_RECEIVED" || p.status === "PARTIALLY_RECEIVED"));

  const handleSave = async () => {
    if (!vendorId || !invoiceNum || !amount) { toast.error("Vendor, invoice number and amount are required."); return; }
    setSaving(true);
    try {
      await apService.create({
        vendorId: Number(vendorId), purchaseOrderId: poId ? Number(poId) : undefined,
        vendorInvoiceNumber: invoiceNum, billDate, dueDate: dueDate || undefined,
        billAmount: Number(amount), taxAmount: Number(tax) || 0, notes,
      });
      toast.success("Vendor bill created. 3-Way Match running…"); onSaved(); onClose();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? "Failed."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Record Vendor Bill</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5"><Label>Vendor *</Label>
            <Select value={vendorId} onValueChange={v => { setVendorId(v); setPoId(""); }}>
              <SelectTrigger><SelectValue placeholder="Select vendor…" /></SelectTrigger>
              <SelectContent>{vendors.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Link to Purchase Order</Label>
            <Select value={poId} onValueChange={setPoId} disabled={!vendorId}>
              <SelectTrigger><SelectValue placeholder="Select PO (optional)…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {vendorPOs.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.poNumber} — ₹{Number(p.totalAmount).toLocaleString("en-IN")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Invoice Number *</Label><Input value={invoiceNum} onChange={e => setInvoiceNum(e.target.value)} placeholder="INV-2025-001" /></div>
            <div className="space-y-1.5"><Label>Bill Date *</Label><Input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Due Date</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Bill Amount (₹) *</Label><Input type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></div>
            <div className="space-y-1.5"><Label>Tax / GST (₹)</Label><Input type="number" min={0} value={tax} onChange={e => setTax(e.target.value)} placeholder="0.00" /></div>
            <div className="space-y-1.5 col-span-1">
              {amount && <p className="text-sm font-bold text-primary mt-2">Total: {INR(Number(amount) + Number(tax || 0))}</p>}
            </div>
          </div>
          <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>

          <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-blue-700">
            <strong>3-Way Match</strong> will automatically run on save. If PO and GRN quantities match the bill amount within 2%, the bill becomes eligible for payment.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Record Bill"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function VendorBills() {
  const [bills, setBills] = useState<VendorBillResponseDTO[]>([]);
  const [vendors, setVendors] = useState<VendorResponseDTO[]>([]);
  const [pos, setPOs] = useState<PurchaseOrderResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, vRes, pRes] = await Promise.all([apService.getAll(), vendorService.getAll(), poService.getAll()]);
      setBills(bRes.data); setVendors(vRes.data); setPOs(pRes.data);
    } catch { toast.error("Failed to load vendor bills."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = bills.filter(b => statusFilter === "all" || b.status === statusFilter);
  const outstanding = bills.filter(b => b.status === "APPROVED_FOR_PAYMENT").reduce((s, b) => s + Number(b.totalPayable), 0);
  const overdue = bills.filter(b => b.overdue).length;
  const mismatches = bills.filter(b => b.status === "MISMATCH").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" /> Vendor Bills & Accounts Payable</h2>
          <p className="text-sm text-muted-foreground mt-0.5">3-Way Match engine · {bills.length} total bills</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="h-3.5 w-3.5 mr-1.5" />Record Bill</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Outstanding Payables", value: INR(outstanding), color: outstanding > 0 ? "text-amber-600" : "text-foreground" },
          { label: "Overdue Bills", value: overdue, color: overdue > 0 ? "text-rose-600" : "text-foreground" },
          { label: "Match Mismatches", value: mismatches, color: mismatches > 0 ? "text-rose-600" : "text-foreground" },
          { label: "Total Bills", value: bills.length, color: "text-foreground" },
        ].map(k => (
          <Card key={k.label} className="border-border/50 bg-card/60">
            <CardContent className="pt-3 pb-3"><p className={`text-xl font-black ${k.color}`}>{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 w-44 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {(Object.keys(STATUS_META) as VendorBillStatus[]).map(s => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center"><Receipt className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No vendor bills found.</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(b => <BillCard key={b.id} bill={b} onAction={load} />)}
        </div>
      )}

      <CreateBillDialog open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} vendors={vendors} pos={pos} />
    </div>
  );
}
