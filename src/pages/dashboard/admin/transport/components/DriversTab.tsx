import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Users, Phone, CreditCard, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { Driver, DriverStatus } from "@/services/transportMock";
import { MOCK_VEHICLES } from "@/services/transportMock";

interface DriversTabProps {
  drivers: Driver[];
  onDriversChange: (d: Driver[]) => void;
}

function StatusBadge({ status }: { status: DriverStatus }) {
  const map: Record<DriverStatus, string> = {
    "On-Duty":   "bg-emerald-500/10 text-emerald-700",
    "Available": "bg-blue-500/10 text-blue-700",
    "On-Leave":  "bg-amber-500/10 text-amber-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${map[status]}`}>
      {status}
    </span>
  );
}

const BLANK_DRIVER: Omit<Driver, "id" | "photoInitials"> = {
  name: "", licenseNumber: "", phone: "", yearsExperience: 0,
  assignedVehicleId: null, status: "Available",
  address: "", joiningDate: new Date().toISOString().split("T")[0],
};

export function DriversTab({ drivers, onDriversChange }: DriversTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState<Omit<Driver, "id" | "photoInitials">>(BLANK_DRIVER);

  const openAdd = () => {
    setEditing(null);
    setForm(BLANK_DRIVER);
    setShowModal(true);
  };

  const openEdit = (d: Driver) => {
    setEditing(d);
    const { id: _id, photoInitials: _pi, ...rest } = d;
    setForm(rest);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.licenseNumber.trim()) {
      toast.error("Name and license number are required");
      return;
    }
    const photoInitials = form.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    if (editing) {
      onDriversChange(drivers.map((d) => d.id === editing.id ? { ...form, id: editing.id, photoInitials } : d));
      toast.success("Driver updated");
    } else {
      const id = Math.max(0, ...drivers.map((d) => d.id)) + 1;
      onDriversChange([...drivers, { ...form, id, photoInitials }]);
      toast.success("Driver added");
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    onDriversChange(drivers.filter((d) => d.id !== id));
    toast.success("Driver removed");
  };

  const toggleStatus = (id: number) => {
    onDriversChange(drivers.map((d) => {
      if (d.id !== id) return d;
      const next: DriverStatus = d.status === "Available" ? "On-Duty" : d.status === "On-Duty" ? "On-Leave" : "Available";
      return { ...d, status: next };
    }));
  };

  const counts = {
    "On-Duty":   drivers.filter((d) => d.status === "On-Duty").length,
    "Available": drivers.filter((d) => d.status === "Available").length,
    "On-Leave":  drivers.filter((d) => d.status === "On-Leave").length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {(["On-Duty", "Available", "On-Leave"] as const).map((s) => (
            <span key={s} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              {s}: {counts[s]}
            </span>
          ))}
        </div>
        <Button onClick={openAdd} size="sm" className="h-9 gap-2">
          <Plus className="h-4 w-4" /> Add Driver
        </Button>
      </div>

      {/* Driver Cards Grid */}
      {drivers.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No drivers added yet</p>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {drivers.map((d) => {
          const vehicle = MOCK_VEHICLES.find((v) => v.id === d.assignedVehicleId);
          return (
            <Card key={d.id} className="relative overflow-hidden border-border/60 hover:shadow-md transition-shadow">
              <div className="p-5">
                {/* Avatar + Name */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                    {d.photoInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.yearsExperience} yrs experience
                    </p>
                    <div className="mt-1.5">
                      <StatusBadge status={d.status} />
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span>{d.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CreditCard className="h-3 w-3 shrink-0" />
                    <span className="font-mono">{d.licenseNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Car className="h-3 w-3 shrink-0" />
                    <span>{vehicle?.vehicleNumber ?? "Not Assigned"}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-2 pt-4 border-t border-border/50">
                  <button
                    onClick={() => toggleStatus(d.id)}
                    className="flex-1 text-xs font-medium rounded-lg border border-border py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    Toggle Status
                  </button>
                  <button
                    onClick={() => openEdit(d)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-foreground">
                {editing ? "Edit Driver" : "Add New Driver"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-base" placeholder="e.g. Rajesh Kumar" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">License Number *</label>
                  <input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} className="input-base font-mono" placeholder="DL-XXXXXXX" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-base" placeholder="9876543210" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Years of Experience</label>
                  <input type="number" value={form.yearsExperience} onChange={(e) => setForm({ ...form, yearsExperience: +e.target.value })} className="input-base" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as DriverStatus })} className="input-base">
                    {["Available", "On-Duty", "On-Leave"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Assign Vehicle</label>
                  <select value={form.assignedVehicleId ?? ""} onChange={(e) => setForm({ ...form, assignedVehicleId: e.target.value ? +e.target.value : null })} className="input-base">
                    <option value="">— None —</option>
                    {MOCK_VEHICLES.map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Joining Date</label>
                  <input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} className="input-base" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Address</label>
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-base" placeholder="Full address" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? "Save Changes" : "Add Driver"}</Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
