import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Pencil, Wrench, Search, Bus, CheckCircle2, AlertTriangle, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { Vehicle, VehicleStatus, FuelType, VehicleType } from "@/services/transportMock";
import { MOCK_DRIVERS } from "@/services/transportMock";

interface FleetTabProps {
  vehicles: Vehicle[];
  onVehiclesChange: (v: Vehicle[]) => void;
}

function StatusBadge({ status }: { status: VehicleStatus }) {
  const map: Record<VehicleStatus, { cls: string; icon: React.ElementType; label: string }> = {
    Active:      { cls: "bg-emerald-500/10 text-emerald-700", icon: CheckCircle2, label: "Active" },
    Maintenance: { cls: "bg-amber-500/10 text-amber-700",   icon: Wrench,       label: "Maintenance" },
    Inactive:    { cls: "bg-red-500/10 text-red-700",        icon: XCircle,      label: "Inactive" },
  };
  const cfg = map[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

const BLANK_VEHICLE: Omit<Vehicle, "id"> = {
  vehicleNumber: "", type: "Bus", capacity: 50, seatsUsed: 0,
  driverId: null, fuelType: "Diesel", kmDriven: 0, status: "Active",
  lastServiceDate: new Date().toISOString().split("T")[0],
  nextServiceKm: 5000, routeId: null,
  registrationExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
};

export function FleetTab({ vehicles, onVehiclesChange }: FleetTabProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | "All">("All");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<Omit<Vehicle, "id">>(BLANK_VEHICLE);

  const filtered = vehicles.filter((v) => {
    const matchSearch =
      v.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
      v.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openAdd = () => {
    setEditing(null);
    setForm(BLANK_VEHICLE);
    setShowModal(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditing(v);
    const { id: _id, ...rest } = v;
    setForm(rest);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.vehicleNumber.trim()) {
      toast.error("Vehicle number is required");
      return;
    }
    if (editing) {
      onVehiclesChange(vehicles.map((v) => v.id === editing.id ? { ...form, id: editing.id } : v));
      toast.success("Vehicle updated");
    } else {
      const newId = Math.max(0, ...vehicles.map((v) => v.id)) + 1;
      onVehiclesChange([...vehicles, { ...form, id: newId }]);
      toast.success("Vehicle added");
    }
    setShowModal(false);
  };

  const markMaintenance = (id: number) => {
    onVehiclesChange(vehicles.map((v) => v.id === id ? { ...v, status: "Maintenance" } : v));
    toast.info("Vehicle marked for maintenance");
  };

  const counts = {
    All: vehicles.length,
    Active: vehicles.filter((v) => v.status === "Active").length,
    Maintenance: vehicles.filter((v) => v.status === "Maintenance").length,
    Inactive: vehicles.filter((v) => v.status === "Inactive").length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          {(["All", "Active", "Maintenance", "Inactive"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {s} ({counts[s]})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicles…"
              className="h-9 w-52 rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <Button onClick={openAdd} size="sm" className="h-9 gap-2">
            <Plus className="h-4 w-4" /> Add Vehicle
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden border-border/60">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Vehicle No.", "Type", "Capacity", "Utilization", "Driver", "Fuel", "KM Driven", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                    <Bus className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No vehicles found
                  </td>
                </tr>
              )}
              {filtered.map((v) => {
                const driver = MOCK_DRIVERS.find((d) => d.id === v.driverId);
                const pct = v.capacity > 0 ? Math.round((v.seatsUsed / v.capacity) * 100) : 0;
                const pctColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
                return (
                  <tr key={v.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-foreground">{v.vehicleNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.capacity}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${pctColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{v.seatsUsed}/{v.capacity}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{driver?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.fuelType}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.kmDriven.toLocaleString("en-IN")} km</td>
                    <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(v)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        {v.status !== "Maintenance" && (
                          <button
                            onClick={() => markMaintenance(v.id)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-500/10 transition-colors"
                          >
                            <Wrench className="h-3 w-3" /> Service
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-foreground">
                {editing ? "Edit Vehicle" : "Add New Vehicle"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Vehicle Number *">
                  <input value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                    className="input-base" placeholder="e.g. DL 1A 7890" />
                </FormField>
                <FormField label="Type">
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as VehicleType })} className="input-base">
                    {["Bus", "Mini-Bus", "Van"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </FormField>
                <FormField label="Capacity">
                  <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: +e.target.value })} className="input-base" />
                </FormField>
                <FormField label="Fuel Type">
                  <select value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value as FuelType })} className="input-base">
                    {["Diesel", "CNG", "Electric"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </FormField>
                <FormField label="KM Driven">
                  <input type="number" value={form.kmDriven} onChange={(e) => setForm({ ...form, kmDriven: +e.target.value })} className="input-base" />
                </FormField>
                <FormField label="Status">
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as VehicleStatus })} className="input-base">
                    {["Active", "Maintenance", "Inactive"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </FormField>
                <FormField label="Reg. Expiry">
                  <input type="date" value={form.registrationExpiry} onChange={(e) => setForm({ ...form, registrationExpiry: e.target.value })} className="input-base" />
                </FormField>
                <FormField label="Assign Driver">
                  <select value={form.driverId ?? ""} onChange={(e) => setForm({ ...form, driverId: e.target.value ? +e.target.value : null })} className="input-base">
                    <option value="">— None —</option>
                    {MOCK_DRIVERS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </FormField>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? "Save Changes" : "Add Vehicle"}</Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
