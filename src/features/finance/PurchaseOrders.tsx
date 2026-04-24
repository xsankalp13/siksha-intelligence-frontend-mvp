import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ShoppingCart, Plus, RefreshCw, ChevronDown, ChevronRight, Send, CheckCircle, XCircle, Truck, PackageCheck, Filter } from "lucide-react";
import { toast } from "sonner";
import { poService, vendorService, type PurchaseOrderResponseDTO, type VendorResponseDTO, type POStatus } from "@/services/procurement";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const STATUS_META: Record<POStatus, { label: string; color: string; bg: string }> = {
  DRAFT:              { label: "Draft",              color: "text-slate-600",   bg: "bg-slate-500/10" },
  SUBMITTED:          { label: "Submitted",          color: "text-blue-600",    bg: "bg-blue-500/10" },
  APPROVED:           { label: "Approved",           color: "text-emerald-600", bg: "bg-emerald-500/10" },
  REJECTED:           { label: "Rejected",           color: "text-rose-600",    bg: "bg-rose-500/10" },
  PARTIALLY_RECEIVED: { label: "Partial Receipt",    color: "text-amber-600",   bg: "bg-amber-500/10" },
  FULLY_RECEIVED:     { label: "Fully Received",     color: "text-teal-600",    bg: "bg-teal-500/10" },
  CANCELLED:          { label: "Cancelled",          color: "text-muted-foreground", bg: "bg-muted" },
  CLOSED:             { label: "Closed",             color: "text-purple-600",  bg: "bg-purple-500/10" },
};

const INR = (v: number) => `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

function PORow({ po, onRefresh }: { po: PurchaseOrderResponseDTO; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing] = useState(false);
  const m = STATUS_META[po.status];

  const doAction = async (fn: () => Promise<any>, msg: string) => {
    setActing(true);
    try { await fn(); toast.success(msg); onRefresh(); }
    catch (err: any) { toast.error(err?.response?.data?.message ?? "Action failed."); }
    finally { setActing(false); }
  };

  return (
    <div className="border border-border/30 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3.5 hover:bg-muted/30 transition-colors text-left">
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        <span className="text-xs font-mono font-bold text-foreground/70 w-28 shrink-0">{po.poNumber}</span>
        <span className="text-xs text-muted-foreground w-24 shrink-0">{format(new Date(po.orderDate), "dd MMM yyyy")}</span>
        <span className="flex-1 text-sm font-medium truncate">{po.vendorName}</span>
        {po.department && <span className="text-xs text-muted-foreground shrink-0 w-24 truncate">{po.department}</span>}
        <span className="text-sm font-bold shrink-0 w-24 text-right">{INR(po.totalAmount)}</span>
        <Badge variant="outline" className={`text-[9px] font-bold border-transparent shrink-0 ${m.color} ${m.bg}`}>{m.label}</Badge>
        <span className="text-[10px] text-muted-foreground shrink-0">{po.grnCount} GRN</span>
      </button>

      {expanded && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="border-t border-border/30 bg-muted/20 px-4 py-4 space-y-4">
          {/* Items */}
          <table className="w-full text-xs">
            <thead><tr className="text-muted-foreground">
              <th className="text-left py-1 font-medium">Description</th>
              <th className="text-right py-1 font-medium w-16">Qty</th>
              <th className="text-right py-1 font-medium w-20">Unit Price</th>
              <th className="text-right py-1 font-medium w-24">Total</th>
              <th className="text-right py-1 font-medium w-20">Received</th>
              <th className="text-right py-1 font-medium w-20">Outstanding</th>
            </tr></thead>
            <tbody className="divide-y divide-border/20">
              {po.items.map(item => (
                <tr key={item.itemId} className={item.fullyReceived ? "text-muted-foreground" : ""}>
                  <td className="py-1.5 pr-2">{item.description} {item.unitOfMeasure ? `(${item.unitOfMeasure})` : ""}</td>
                  <td className="py-1.5 text-right">{Number(item.quantity).toFixed(2)}</td>
                  <td className="py-1.5 text-right">{INR(item.unitPrice)}</td>
                  <td className="py-1.5 text-right font-semibold">{INR(item.lineTotal)}</td>
                  <td className="py-1.5 text-right text-emerald-600">{Number(item.quantityReceived).toFixed(2)}</td>
                  <td className={`py-1.5 text-right font-bold ${Number(item.outstandingQuantity) > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                    {Number(item.outstandingQuantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border/60 font-bold text-xs">
              <tr>
                <td colSpan={3} className="pt-2 text-right text-muted-foreground">Before Tax</td>
                <td className="pt-2 text-right">{INR(po.totalBeforeTax)}</td>
                <td colSpan={2} rowSpan={3} className="pt-2 pl-4 align-top text-[10px] text-muted-foreground">
                  {po.approvedBy && <p>Approved by: <strong>{po.approvedBy}</strong></p>}
                  {po.description && <p className="mt-1 text-foreground/70">{po.description}</p>}
                </td>
              </tr>
              <tr><td colSpan={3} className="text-right text-muted-foreground">GST / Tax</td><td className="text-right">{INR(po.taxAmount)}</td></tr>
              <tr><td colSpan={3} className="text-right text-emerald-700">Total Payable</td><td className="text-right text-emerald-700">{INR(po.totalAmount)}</td></tr>
            </tfoot>
          </table>

          {/* Actions */}
          <div className="flex gap-2">
            {po.status === "DRAFT" && <Button size="sm" onClick={() => doAction(() => poService.submit(po.id), "PO submitted.")} disabled={acting}><Send className="h-3.5 w-3.5 mr-1.5" />Submit</Button>}
            {po.status === "SUBMITTED" && <>
              <Button size="sm" onClick={() => doAction(() => poService.approve(po.id), "PO approved!")} disabled={acting}><CheckCircle className="h-3.5 w-3.5 mr-1.5" />Approve</Button>
              <Button size="sm" variant="outline" onClick={() => doAction(() => poService.reject(po.id, "Rejected"), "PO rejected.")} disabled={acting}><XCircle className="h-3.5 w-3.5 mr-1.5 text-rose-500" />Reject</Button>
            </>}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function POCreateDialog({ open, onClose, onSaved, vendors }: {
  open: boolean; onClose: () => void; onSaved: () => void; vendors: VendorResponseDTO[];
}) {
  const [vendorId, setVendorId] = useState("");
  const [dept, setDept] = useState("");
  const [orderDate, setOrderDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [deliveryDate, setDeliveryDate] = useState("");
  const [desc, setDesc] = useState("");
  const [gst, setGst] = useState("18");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ description: "", unitOfMeasure: "Nos", quantity: "1", unitPrice: "" }]);
  const [saving, setSaving] = useState(false);

  const updateItem = (i: number, k: string, v: string) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const total = items.reduce((s, it) => s + (Number(it.quantity) * Number(it.unitPrice) || 0), 0);
  const tax   = total * Number(gst) / 100;

  const handleSave = async () => {
    if (!vendorId) { toast.error("Vendor is required."); return; }
    if (items.some(it => !it.description || !it.unitPrice)) { toast.error("All items need a description and unit price."); return; }
    setSaving(true);
    try {
      await poService.create({
        vendorId: Number(vendorId), department: dept, orderDate,
        expectedDeliveryDate: deliveryDate || undefined, description: desc,
        gstPercentage: Number(gst), notes,
        items: items.map(it => ({ description: it.description, unitOfMeasure: it.unitOfMeasure, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) }))
      });
      toast.success("Purchase Order created."); onSaved(); onClose();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? "Failed."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5"><Label>Vendor *</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger><SelectValue placeholder="Select active vendor…" /></SelectTrigger>
                <SelectContent>{vendors.filter(v => v.status === "ACTIVE").map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name} ({v.vendorCode})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Department</Label><Input value={dept} onChange={e => setDept(e.target.value)} placeholder="CSE Lab, Library…" /></div>
            <div className="space-y-1.5"><Label>Order Date *</Label><Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Expected Delivery</Label><Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>GST %</Label><Input type="number" min={0} max={28} value={gst} onChange={e => setGst(e.target.value)} /></div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Line Items</p>
            <div className="grid grid-cols-[1fr_80px_80px_100px_24px] gap-2 text-[10px] text-muted-foreground px-1">
              <span>Description *</span><span>UoM</span><span className="text-right">Qty</span><span className="text-right">Unit Price *</span><span />
            </div>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_80px_80px_100px_24px] gap-2 items-center">
                <Input className="h-8 text-xs" value={it.description} placeholder="Item description" onChange={e => updateItem(idx, "description", e.target.value)} />
                <Input className="h-8 text-xs" value={it.unitOfMeasure} onChange={e => updateItem(idx, "unitOfMeasure", e.target.value)} />
                <Input className="h-8 text-xs text-right" type="number" min={0} value={it.quantity} onChange={e => updateItem(idx, "quantity", e.target.value)} />
                <Input className="h-8 text-xs text-right" type="number" min={0} value={it.unitPrice} placeholder="0.00" onChange={e => updateItem(idx, "unitPrice", e.target.value)} />
                <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500/60" onClick={() => items.length > 1 && setItems(p => p.filter((_, i) => i !== idx))}>✕</Button>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setItems(p => [...p, { description: "", unitOfMeasure: "Nos", quantity: "1", unitPrice: "" }])}>
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
              <div className="text-right text-xs space-y-0.5">
                <p className="text-muted-foreground">Before Tax: <strong className="text-foreground">{INR(total)}</strong></p>
                <p className="text-muted-foreground">GST ({gst}%): <strong className="text-foreground">{INR(tax)}</strong></p>
                <p className="font-black text-sm text-primary">Total: {INR(total + tax)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5"><Label>Description</Label><Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Purpose of this purchase…" /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Creating..." : "Create PO"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PurchaseOrders() {
  const [pos, setPOs] = useState<PurchaseOrderResponseDTO[]>([]);
  const [vendors, setVendors] = useState<VendorResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [poRes, vRes] = await Promise.all([poService.getAll(), vendorService.getAll()]);
      setPOs(poRes.data); setVendors(vRes.data);
    } catch { toast.error("Failed to load purchase orders."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = pos.filter(p => statusFilter === "all" || p.status === statusFilter);
  const totalValue = pos.filter(p => p.status === "APPROVED" || p.status === "FULLY_RECEIVED").reduce((s, p) => s + Number(p.totalAmount), 0);
  const pending   = pos.filter(p => p.status === "SUBMITTED").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary" /> Purchase Orders</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{pos.length} orders · {pending} awaiting approval</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="h-3.5 w-3.5 mr-1.5" />New PO</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total POs", value: pos.length, color: "text-foreground" },
          { label: "Active Value", value: INR(totalValue), color: "text-primary" },
          { label: "Pending Approval", value: pending, color: pending > 0 ? "text-amber-600" : "text-foreground" },
        ].map(k => (
          <Card key={k.label} className="border-border/50 bg-card/60">
            <CardContent className="pt-3 pb-3"><p className={`text-xl font-black ${k.color}`}>{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {(Object.keys(STATUS_META) as POStatus[]).map(s => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center"><ShoppingCart className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" /><p className="text-sm text-muted-foreground">No purchase orders found.</p></div>
      ) : (
        <div className="space-y-2">{filtered.map(po => <PORow key={po.id} po={po} onRefresh={load} />)}</div>
      )}

      <POCreateDialog open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} vendors={vendors} />
    </div>
  );
}
