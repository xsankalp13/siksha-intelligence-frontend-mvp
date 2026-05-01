import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Building2, Plus, RefreshCw, Pencil, Trash2, CheckCircle, Search, Phone, Mail, MapPin, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { vendorService, type VendorResponseDTO, type VendorStatus } from "@/services/procurement";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const STATUS_META: Record<VendorStatus, { label: string; color: string; bg: string }> = {
  PENDING_VERIFICATION: { label: "Pending",     color: "text-amber-600",   bg: "bg-amber-500/10" },
  ACTIVE:               { label: "Active",       color: "text-emerald-600", bg: "bg-emerald-500/10" },
  SUSPENDED:            { label: "Suspended",    color: "text-rose-600",    bg: "bg-rose-500/10" },
  BLACKLISTED:          { label: "Blacklisted",  color: "text-red-800",     bg: "bg-red-500/10" },
};

const STATUSES: VendorStatus[] = ["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "BLACKLISTED"];

function VendorCard({ vendor, onEdit, onDeactivate }: {
  vendor: VendorResponseDTO;
  onEdit: () => void;
  onDeactivate: () => void;
}) {
  const m = STATUS_META[vendor.status];
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="group rounded-2xl border border-border/40 bg-card/60 p-4 hover:shadow-md hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{vendor.name}</p>
              <p className="text-[10px] font-mono text-muted-foreground">{vendor.vendorCode}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={`text-[9px] font-bold border-transparent ${m.color} ${m.bg}`}>{m.label}</Badge>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
          {vendor.status === "ACTIVE" && (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={onDeactivate}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground">
        {vendor.category && (
          <p className="text-[10px] font-semibold text-primary/70 bg-primary/5 rounded px-1.5 py-0.5 inline-block">{vendor.category}</p>
        )}
        {vendor.contactPerson && <p className="flex items-center gap-1"><CheckCircle className="h-3 w-3" />{vendor.contactPerson}</p>}
        {vendor.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{vendor.phone}</p>}
        {vendor.email && <p className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{vendor.email}</p>}
        {(vendor.city || vendor.state) && (
          <p className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[vendor.city, vendor.state].filter(Boolean).join(", ")}</p>
        )}
        {vendor.gstin && <p className="flex items-center gap-1 font-mono text-[10px]"><CreditCard className="h-3 w-3" />GST: {vendor.gstin}</p>}
        <p className="text-[10px] text-muted-foreground/60">Net {vendor.paymentTermsDays} days</p>
      </div>
    </motion.div>
  );
}

function VendorFormDialog({ open, onClose, onSaved, editing }: {
  open: boolean; onClose: () => void; onSaved: () => void; editing: VendorResponseDTO | null;
}) {
  const EMPTY = { name: "", legalType: "", gstin: "", pan: "", contactPerson: "", email: "", phone: "",
    address: "", city: "", state: "", pincode: "", bankAccountNumber: "", bankName: "", ifscCode: "",
    category: "", paymentTermsDays: 30, status: "PENDING_VERIFICATION" as VendorStatus, notes: "" };
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({ name: editing.name, legalType: editing.legalType ?? "", gstin: editing.gstin ?? "",
        pan: editing.pan ?? "", contactPerson: editing.contactPerson ?? "", email: editing.email ?? "",
        phone: editing.phone ?? "", address: editing.address ?? "", city: editing.city ?? "",
        state: editing.state ?? "", pincode: editing.pincode ?? "",
        bankAccountNumber: editing.bankAccountNumber ?? "", bankName: editing.bankName ?? "",
        ifscCode: editing.ifscCode ?? "", category: editing.category ?? "",
        paymentTermsDays: editing.paymentTermsDays, status: editing.status, notes: editing.notes ?? "" });
    } else { setForm({ ...EMPTY }); }
  }, [editing, open]);

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Vendor name is required."); return; }
    setSaving(true);
    try {
      if (editing) { await vendorService.update(editing.id, form); toast.success("Vendor updated."); }
      else { await vendorService.create(form); toast.success("Vendor created."); }
      onSaved(); onClose();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? "Failed to save vendor."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit Vendor" : "Add New Vendor"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5"><Label>Vendor Name *</Label><Input value={form.name} onChange={f("name")} /></div>
            <div className="space-y-1.5"><Label>Legal Type</Label>
              <Input value={form.legalType} onChange={f("legalType")} placeholder="Pvt Ltd, LLP, Trust…" /></div>
            <div className="space-y-1.5"><Label>Category</Label>
              <Input value={form.category} onChange={f("category")} placeholder="IT Hardware, Lab Supplies…" /></div>
            <div className="space-y-1.5"><Label>GSTIN</Label><Input value={form.gstin} onChange={f("gstin")} placeholder="22AAAAA0000A1Z5" /></div>
            <div className="space-y-1.5"><Label>PAN</Label><Input value={form.pan} onChange={f("pan")} placeholder="AAAAA0000A" /></div>
            <div className="space-y-1.5"><Label>Contact Person</Label><Input value={form.contactPerson} onChange={f("contactPerson")} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={f("phone")} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={f("email")} /></div>
            <div className="col-span-2 space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={f("address")} /></div>
            <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={f("city")} /></div>
            <div className="space-y-1.5"><Label>State</Label><Input value={form.state} onChange={f("state")} /></div>
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Banking Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Bank Name</Label><Input value={form.bankName} onChange={f("bankName")} /></div>
            <div className="space-y-1.5"><Label>Account Number</Label><Input value={form.bankAccountNumber} onChange={f("bankAccountNumber")} /></div>
            <div className="space-y-1.5"><Label>IFSC Code</Label><Input value={form.ifscCode} onChange={f("ifscCode")} /></div>
            <div className="space-y-1.5"><Label>Payment Terms (days)</Label>
              <Input type="number" min={0} value={form.paymentTermsDays} onChange={(e) => setForm(p => ({ ...p, paymentTermsDays: Number(e.target.value) }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v as VendorStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={f("notes")} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editing ? "Save Changes" : "Add Vendor"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VendorDirectory() {
  const [vendors, setVendors] = useState<VendorResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VendorResponseDTO | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await vendorService.getAll(); setVendors(res.data); }
    catch { toast.error("Failed to load vendors."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = vendors.filter(v => {
    const matchesSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.vendorCode?.toLowerCase().includes(search.toLowerCase())) ||
      (v.category?.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDeactivate = async (v: VendorResponseDTO) => {
    if (!confirm(`Suspend vendor "${v.name}"?`)) return;
    try { await vendorService.deactivate(v.id); toast.success("Vendor suspended."); load(); }
    catch (err: any) { toast.error(err?.response?.data?.message ?? "Failed."); }
  };

  const activeCount = vendors.filter(v => v.status === "ACTIVE").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Vendor Directory</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{vendors.length} total vendors · {activeCount} active</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-3.5 w-3.5 mr-1.5" />Add Vendor</Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8 h-7 text-xs" placeholder="Search name, code, category…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-44 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center"><Building2 className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No vendors found. Add your first vendor to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(v => (
            <VendorCard key={v.id} vendor={v}
              onEdit={() => { setEditing(v); setFormOpen(true); }}
              onDeactivate={() => handleDeactivate(v)} />
          ))}
        </div>
      )}

      <VendorFormDialog open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} editing={editing} />
    </div>
  );
}
