import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp, MapPin, Clock, Users, Bus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { Route, Stop } from "@/services/transportMock";
import { MOCK_VEHICLES } from "@/services/transportMock";

interface RoutesTabProps {
  routes: Route[];
  onRoutesChange: (r: Route[]) => void;
}

const BLANK_STOP: Omit<Stop, "id"> = { name: "", time: "07:00 AM", studentsCount: 0, distanceFromSchool: 0 };

export function RoutesTab({ routes, onRoutesChange }: RoutesTabProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Route | null>(null);
  const [routeForm, setRouteForm] = useState({
    name: "", distanceKm: 0, durationMin: 0, vehicleId: null as number | null,
    monthlyFee: 0, studentsCount: 0,
  });
  const [stops, setStops] = useState<Stop[]>([]);

  const openAdd = () => {
    setEditing(null);
    setRouteForm({ name: "", distanceKm: 0, durationMin: 0, vehicleId: null, monthlyFee: 0, studentsCount: 0 });
    setStops([]);
    setShowModal(true);
  };

  const openEdit = (r: Route) => {
    setEditing(r);
    setRouteForm({
      name: r.name, distanceKm: r.distanceKm, durationMin: r.durationMin,
      vehicleId: r.vehicleId, monthlyFee: r.monthlyFee, studentsCount: r.studentsCount,
    });
    setStops([...r.stops]);
    setShowModal(true);
  };

  const addStop = () => {
    const id = Math.max(0, ...stops.map((s) => s.id)) + 1;
    setStops([...stops, { ...BLANK_STOP, id }]);
  };

  const removeStop = (id: number) => setStops(stops.filter((s) => s.id !== id));

  const updateStop = (id: number, field: keyof Stop, value: string | number) => {
    setStops(stops.map((s) => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSave = () => {
    if (!routeForm.name.trim()) { toast.error("Route name is required"); return; }
    if (stops.length === 0) { toast.error("Add at least one stop"); return; }
    if (editing) {
      const updated: Route = { ...routeForm, stops, id: editing.id };
      onRoutesChange(routes.map((r) => r.id === editing.id ? updated : r));
      toast.success("Route updated");
    } else {
      const id = Math.max(0, ...routes.map((r) => r.id)) + 1;
      const newRoute: Route = { ...routeForm, stops, id };
      onRoutesChange([...routes, newRoute]);
      toast.success("Route added");
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    onRoutesChange(routes.filter((r) => r.id !== id));
    toast.success("Route deleted");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{routes.length} routes configured</p>
        <Button onClick={openAdd} size="sm" className="h-9 gap-2">
          <Plus className="h-4 w-4" /> Add Route
        </Button>
      </div>

      {/* Route Cards */}
      {routes.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Bus className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No routes configured</p>
        </Card>
      )}

      <div className="grid gap-4">
        {routes.map((route) => {
          const isOpen = expandedId === route.id;
          const vehicle = MOCK_VEHICLES.find((v) => v.id === route.vehicleId);
          const pct = vehicle ? Math.round((route.studentsCount / vehicle.capacity) * 100) : 0;
          const pctColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";

          return (
            <Card key={route.id} className="overflow-hidden border-border/60">
              {/* Route header */}
              <div className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                  <MapPin className="h-5 w-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{route.name}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Bus className="h-3 w-3" />
                      {vehicle?.vehicleNumber ?? "No vehicle"}
                    </span>
                    <span className="text-xs text-muted-foreground">{route.distanceKm} km</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {route.durationMin} min
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> {route.studentsCount} students
                    </span>
                    <span className="text-xs font-semibold text-primary">₹{route.monthlyFee.toLocaleString("en-IN")}/mo</span>
                  </div>
                </div>
                {/* Capacity bar */}
                <div className="hidden md:flex flex-col gap-1 w-28 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Capacity</span>
                    <span className="text-xs font-semibold text-foreground">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${pctColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => openEdit(route)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(route.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => setExpandedId(isOpen ? null : route.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Stops timeline */}
              {isOpen && (
                <div className="border-t border-border px-5 pb-5 pt-4">
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Stops Timeline
                  </p>
                  <div className="relative ml-4">
                    {/* vertical line */}
                    <div className="absolute left-0 top-2 bottom-2 w-px bg-border" />
                    <div className="space-y-4">
                      {route.stops.map((stop, idx) => (
                        <div key={stop.id} className="relative flex items-start gap-4 pl-6">
                          <div className={`absolute left-0 -translate-x-1/2 h-3 w-3 rounded-full border-2 border-background 
                            ${idx === 0 ? "bg-violet-600" : idx === route.stops.length - 1 ? "bg-primary" : "bg-muted-foreground/60"}`} />
                          <div className="flex-1 flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5">
                            <div>
                              <p className="text-sm font-medium text-foreground">{stop.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{stop.distanceFromSchool} km from school</p>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" /> {stop.studentsCount}
                              </span>
                              <span className="text-xs font-semibold text-violet-600 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {stop.time}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
              <h2 className="text-base font-semibold text-foreground">
                {editing ? "Edit Route" : "Add New Route"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="overflow-y-auto p-6 space-y-5">
              {/* Route Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Route Name *</label>
                  <input value={routeForm.name} onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                    className="input-base" placeholder="e.g. North Zone – Route A" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Distance (km)</label>
                  <input type="number" value={routeForm.distanceKm} onChange={(e) => setRouteForm({ ...routeForm, distanceKm: +e.target.value })} className="input-base" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Duration (min)</label>
                  <input type="number" value={routeForm.durationMin} onChange={(e) => setRouteForm({ ...routeForm, durationMin: +e.target.value })} className="input-base" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Monthly Fee (₹)</label>
                  <input type="number" value={routeForm.monthlyFee} onChange={(e) => setRouteForm({ ...routeForm, monthlyFee: +e.target.value })} className="input-base" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Assign Vehicle</label>
                  <select value={routeForm.vehicleId ?? ""} onChange={(e) => setRouteForm({ ...routeForm, vehicleId: e.target.value ? +e.target.value : null })} className="input-base">
                    <option value="">— None —</option>
                    {MOCK_VEHICLES.map((v) => <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.type})</option>)}
                  </select>
                </div>
              </div>

              {/* Stops Builder */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Stops</h3>
                  <Button variant="outline" size="sm" onClick={addStop} className="h-8 gap-1.5 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Add Stop
                  </Button>
                </div>
                <div className="space-y-2">
                  {stops.map((stop) => (
                    <div key={stop.id} className="grid grid-cols-12 gap-2 items-center">
                      <input value={stop.name} onChange={(e) => updateStop(stop.id, "name", e.target.value)}
                        placeholder="Stop name" className="input-base col-span-4" />
                      <input value={stop.time} onChange={(e) => updateStop(stop.id, "time", e.target.value)}
                        placeholder="07:00 AM" className="input-base col-span-3" />
                      <input type="number" value={stop.distanceFromSchool} onChange={(e) => updateStop(stop.id, "distanceFromSchool", +e.target.value)}
                        placeholder="km" className="input-base col-span-2" />
                      <input type="number" value={stop.studentsCount} onChange={(e) => updateStop(stop.id, "studentsCount", +e.target.value)}
                        placeholder="Students" className="input-base col-span-2" />
                      <button onClick={() => removeStop(stop.id)} className="col-span-1 flex items-center justify-center p-1.5 rounded-lg text-red-400 hover:bg-red-500/10">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {stops.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                      No stops added yet. Click "Add Stop" to begin.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4 shrink-0">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? "Save Changes" : "Add Route"}</Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
