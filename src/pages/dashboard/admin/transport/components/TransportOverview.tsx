import { motion } from "framer-motion";
import {
  Bus,
  MapPin,
  Users,
  GraduationCap,
  TrendingUp,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  Clock,
} from "lucide-react";

import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { Vehicle, Route, Driver, StudentAssignment } from "@/services/transportMock";

interface TransportOverviewProps {
  vehicles: Vehicle[];
  routes: Route[];
  drivers: Driver[];
  assignments: StudentAssignment[];
}

function KpiCard({
  title, value, subtitle, icon: Icon, iconBg, iconColor,
}: {
  title: string; value: string; subtitle: string;
  icon: React.ElementType; iconBg: string; iconColor: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="mt-0.5 text-sm font-medium text-foreground/70">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ElementType }> = {
    Active:      { cls: "bg-emerald-500/10 text-emerald-700", icon: CheckCircle2 },
    Maintenance: { cls: "bg-amber-500/10 text-amber-700",   icon: Wrench },
    Inactive:    { cls: "bg-red-500/10 text-red-700",        icon: AlertTriangle },
  };
  const cfg = map[status] ?? map["Active"];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

export function TransportOverview({ vehicles, routes, drivers, assignments }: TransportOverviewProps) {
  const activeVehicles   = vehicles.filter((v) => v.status === "Active").length;
  const maintenanceCount = vehicles.filter((v) => v.status === "Maintenance").length;
  const inactiveCount    = vehicles.filter((v) => v.status === "Inactive").length;
  const onDutyDrivers    = drivers.filter((d) => d.status === "On-Duty").length;
  const totalStudents    = assignments.length;

  const fleetStatusData = [
    { name: "Active", value: activeVehicles, fill: "#10b981" },
    { name: "Maintenance", value: maintenanceCount, fill: "#f59e0b" },
    { name: "Inactive", value: inactiveCount, fill: "#ef4444" },
  ];

  const capacityData = routes.map((r) => {
    const v = vehicles.find((veh) => veh.id === r.vehicleId);
    return {
      name: r.name.split("–")[0].trim(),
      enrolled: r.studentsCount,
      capacity: v?.capacity ?? 0,
    };
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Vehicles" value={String(vehicles.length)} subtitle={`${activeVehicles} active, ${maintenanceCount} in maintenance`} icon={Bus} iconBg="bg-blue-500/10" iconColor="text-blue-600" />
        <KpiCard title="Active Routes" value={String(routes.length)} subtitle="Running daily routes" icon={MapPin} iconBg="bg-violet-500/10" iconColor="text-violet-600" />
        <KpiCard title="Drivers On-Duty" value={String(onDutyDrivers)} subtitle={`of ${drivers.length} total drivers`} icon={Users} iconBg="bg-amber-500/10" iconColor="text-amber-600" />
        <KpiCard title="Students Enrolled" value={String(totalStudents)} subtitle="Using school transport" icon={GraduationCap} iconBg="bg-emerald-500/10" iconColor="text-emerald-600" />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Fleet Health */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-1 text-sm font-semibold text-foreground">Fleet Health</h3>
          <p className="mb-4 text-xs text-muted-foreground">Vehicle status breakdown</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={fleetStatusData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div className="rounded-xl border border-border bg-card p-3 shadow-lg text-xs">
                      <p className="font-semibold">{payload[0].name}</p>
                      <p className="text-foreground font-bold">{payload[0].value} vehicles</p>
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {fleetStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Capacity Utilization */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Seat Utilization by Route</h3>
              <p className="text-xs text-muted-foreground">Enrolled vs total capacity</p>
            </div>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Live
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={capacityData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="rounded-xl border border-border bg-card p-3 shadow-lg text-xs min-w-[140px]">
                      <p className="mb-2 font-semibold text-foreground">{label}</p>
                      {payload.map((p) => (
                        <div key={String(p.name)} className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                            {p.name}
                          </span>
                          <span className="font-semibold text-foreground">{p.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="capacity" name="Capacity" fill="hsl(var(--muted))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="enrolled" name="Enrolled" fill="url(#enrollGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Route Status Board */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-foreground">Route Status Board</h3>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full">
            <Clock className="h-3 w-3" /> All routes on time
          </div>
        </div>
        <div className="divide-y divide-border">
          {routes.map((route) => {
            const vehicle = vehicles.find((v) => v.id === route.vehicleId);
            const pct = vehicle ? Math.round((route.studentsCount / vehicle.capacity) * 100) : 0;
            const pctColor =
              pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";

            return (
              <div key={route.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-accent/30 transition-colors">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                  <Bus className="h-4 w-4 text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{route.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {vehicle?.vehicleNumber ?? "No vehicle"} · {route.stops.length} stops · {route.distanceKm} km
                  </p>
                </div>
                <div className="shrink-0 w-32 hidden sm:block">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{route.studentsCount}/{vehicle?.capacity ?? "—"}</span>
                    <span className="text-xs font-semibold text-foreground">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pctColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="shrink-0">
                  {vehicle ? <StatusBadge status={vehicle.status} /> : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
