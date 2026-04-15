import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Search, GraduationCap, MapPin, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import type { StudentAssignment, Route, Stop } from "@/services/transportMock";

interface StudentAssignmentTabProps {
  assignments: StudentAssignment[];
  routes: Route[];
  onAssignmentsChange: (a: StudentAssignment[]) => void;
}

// Simulate a pool of unassigned students
const UNASSIGNED_POOL = [
  { id: 201, name: "Amit Rastogi",    className: "9",  section: "A" },
  { id: 202, name: "Neha Jha",        className: "8",  section: "B" },
  { id: 203, name: "Prateek Soni",    className: "10", section: "C" },
  { id: 204, name: "Kavya Rao",       className: "7",  section: "A" },
  { id: 205, name: "Laksh Kapoor",    className: "11", section: "B" },
  { id: 206, name: "Sanya Bhatt",     className: "6",  section: "C" },
  { id: 207, name: "Pranav Sethi",    className: "12", section: "A" },
  { id: 208, name: "Tanvi Chaturvedi",className: "9",  section: "B" },
];

export function StudentAssignmentTab({ assignments, routes, onAssignmentsChange }: StudentAssignmentTabProps) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selStudentId, setSelStudentId] = useState<number | "">("");
  const [selRouteId, setSelRouteId] = useState<number | "">("");
  const [selStopId, setSelStopId] = useState<number | "">("");

  const assignedIds = new Set(assignments.map((a) => a.studentId));
  const availableStudents = UNASSIGNED_POOL.filter((s) => !assignedIds.has(s.id));

  const filteredAssignments = assignments.filter((a) => {
    const s = search.toLowerCase();
    return (
      a.studentName.toLowerCase().includes(s) ||
      a.className.includes(s) ||
      a.section.toLowerCase().includes(s)
    );
  });

  const selectedRoute = routes.find((r) => r.id === selRouteId) ?? null;
  const stopsForRoute: Stop[] = selectedRoute?.stops ?? [];

  const handleAssign = () => {
    if (!selStudentId || !selRouteId || !selStopId) {
      toast.error("Please select student, route, and stop");
      return;
    }
    const student = UNASSIGNED_POOL.find((s) => s.id === selStudentId);
    const route = routes.find((r) => r.id === selRouteId);
    if (!student || !route) return;

    const fee = route.monthlyFee;
    const newId = Math.max(0, ...assignments.map((a) => a.id)) + 1;
    onAssignmentsChange([
      ...assignments,
      {
        id: newId, studentId: student.id, studentName: student.name,
        className: student.className, section: student.section,
        routeId: route.id, stopId: +selStopId, monthlyFee: fee,
        assignedDate: new Date().toISOString().split("T")[0],
      },
    ]);
    toast.success(`${student.name} assigned to ${route.name}`);
    setShowModal(false);
    setSelStudentId("");
    setSelRouteId("");
    setSelStopId("");
  };

  const handleUnassign = (id: number) => {
    const a = assignments.find((x) => x.id === id);
    onAssignmentsChange(assignments.filter((x) => x.id !== id));
    toast.success(`${a?.studentName} removed from transport`);
  };

  const totalMonthlyRevenue = assignments.reduce((sum, a) => sum + a.monthlyFee, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 mb-3">
            <GraduationCap className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-foreground">{assignments.length}</p>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">Students Enrolled</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 mb-3">
            <GraduationCap className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-xl font-bold text-foreground">{availableStudents.length}</p>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">Unassigned Students</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 mb-3">
            <IndianRupee className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-foreground">
            ₹{(totalMonthlyRevenue).toLocaleString("en-IN")}
          </p>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">Monthly Revenue</p>
        </div>
      </div>

      {/* Table header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students…"
            className="h-9 w-64 rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <Button onClick={() => setShowModal(true)} size="sm" className="h-9 gap-2">
          <Plus className="h-4 w-4" /> Assign Student
        </Button>
      </div>

      {/* Assignments Table */}
      <Card className="overflow-hidden border-border/60">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {["Student", "Class", "Route", "Stop", "Monthly Fee", "Assigned", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAssignments.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <GraduationCap className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No students found</p>
                  </td>
                </tr>
              )}
              {filteredAssignments.map((a) => {
                const route = routes.find((r) => r.id === a.routeId);
                const stop = route?.stops.find((s) => s.id === a.stopId);
                return (
                  <tr key={a.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {a.studentName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                        </div>
                        <span className="font-medium text-foreground">{a.studentName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">Class {a.className} – {a.section}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 bg-violet-500/10 px-2 py-0.5 rounded-full">
                        <MapPin className="h-3 w-3" />
                        {route?.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{stop?.name ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      ₹{a.monthlyFee.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{a.assignedDate}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleUnassign(a.id)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" /> Unassign
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Assign Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-base font-semibold text-foreground">Assign Student to Route</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="space-y-4 p-6">
              {availableStudents.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-medium text-muted-foreground">All students are already assigned to routes.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Select Student</label>
                    <select value={selStudentId} onChange={(e) => setSelStudentId(e.target.value ? +e.target.value : "")} className="input-base">
                      <option value="">— Choose student —</option>
                      {availableStudents.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} (Class {s.className}-{s.section})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Select Route</label>
                    <select value={selRouteId} onChange={(e) => { setSelRouteId(e.target.value ? +e.target.value : ""); setSelStopId(""); }} className="input-base">
                      <option value="">— Choose route —</option>
                      {routes.map((r) => <option key={r.id} value={r.id}>{r.name} (₹{r.monthlyFee}/mo)</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Select Boarding Stop</label>
                    <select value={selStopId} onChange={(e) => setSelStopId(e.target.value ? +e.target.value : "")} className="input-base" disabled={!selRouteId}>
                      <option value="">— Choose stop —</option>
                      {stopsForRoute.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.time})</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              {availableStudents.length > 0 && <Button onClick={handleAssign}>Assign</Button>}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
