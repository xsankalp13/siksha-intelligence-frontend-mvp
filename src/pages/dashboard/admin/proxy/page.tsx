/**
 * Admin Proxy Management Dashboard (Phase 2.3 Upgraded)
 *
 * Surfaces:
 *  - Today's staff absences (GET /api/admin/proxy/absent-staff)
 *  - Active peer proxy requests (GET /api/admin/proxy)
 *  - Proxy load stats per teacher (GET /api/admin/proxy/load-stats)
 *  - Admin assign / reassign / cancel actions
 *  - Auto-assign cron status badge
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlarmClock,
  CheckCircle2,
  Clock,
  RefreshCw,
  UserCheck,
  UserX,
  Zap,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getActiveProxyRequestsOnDate,
  getAbsentStaffToday,
  getProxyLoadStats,
  adminCancelProxy,
  type ProxyRequest,
  type AbsentStaffDto,
  type ProxyLoadStatsDto,
} from "@/services/proxyTeacher";

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  ACCEPTED: {
    label: "Covered",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  PENDING: {
    label: "Pending",
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  DECLINED: {
    label: "Declined",
    cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
  CANCELLED: {
    label: "Cancelled",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
};

function todayLabel() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AdminProxyDashboardPage() {
  const today = new Date().toISOString().slice(0, 10);
  const queryClient = useQueryClient();
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-proxy"] });
    setLastRefreshed(new Date());
    toast.info("Proxy data refreshed");
  };

  // ── Queries ──────────────────────────────────────────────────────────
  const { data: proxyRequests = [], isLoading: loadingRequests } = useQuery<ProxyRequest[]>({
    queryKey: ["admin-proxy", "requests", today],
    queryFn: () => getActiveProxyRequestsOnDate(today),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: absentStaff = [], isLoading: loadingAbsent } = useQuery<AbsentStaffDto[]>({
    queryKey: ["admin-proxy", "absent", today],
    queryFn: () => getAbsentStaffToday(today),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: loadStats = [], isLoading: loadingStats } = useQuery<ProxyLoadStatsDto[]>({
    queryKey: ["admin-proxy", "load-stats", today],
    queryFn: () => getProxyLoadStats(today),
    staleTime: 60_000,
  });

  // ── Cancel mutation ──────────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: (id: number) => adminCancelProxy(id),
    onSuccess: () => {
      toast.success("Proxy assignment cancelled");
      queryClient.invalidateQueries({ queryKey: ["admin-proxy"] });
    },
    onError: () => toast.error("Failed to cancel proxy — please try again"),
  });

  // ── Derived state ────────────────────────────────────────────────────
  const pendingCount = proxyRequests.filter((r) => r.status === "PENDING").length;
  const resolvedCount = proxyRequests.filter((r) => r.status === "ACCEPTED").length;
  const uncoveredCount = absentStaff.filter((s) => !s.proxyCovered).length;
  const totalAbsent = absentStaff.length;

  return (
    <div className="space-y-6 pb-10">

      {/* ── Hero Banner ───────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-700 to-fuchsia-800 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="absolute bottom-0 left-0 h-20 w-40 rounded-full bg-white/5 blur-2xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              👥
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Proxy Teacher Management</h2>
              <p className="text-sm text-white/70">{todayLabel()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-assign indicator */}
            <div className="flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 border border-white/20 text-xs">
              <Zap className="h-3 w-3 text-yellow-300" />
              <span className="font-medium">Auto-assign ON</span>
              <span className="text-white/60">• every 5 min</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* ── KPI Strip ─────────────────────────────────────────────── */}
        <div className="relative mt-4 flex flex-wrap gap-3">
          {[
            {
              label: "Absent Today",
              value: loadingAbsent ? "…" : totalAbsent,
              icon: "👤",
              color: "bg-white/15",
            },
            {
              label: "Uncovered",
              value: loadingAbsent ? "…" : uncoveredCount,
              icon: "⚠️",
              color: uncoveredCount > 0 ? "bg-red-500/30 border border-red-400/40" : "bg-white/15",
            },
            {
              label: "Pending Proxies",
              value: loadingRequests ? "…" : pendingCount,
              icon: "⏳",
              color: "bg-white/15",
            },
            {
              label: "Covered",
              value: loadingRequests ? "…" : resolvedCount,
              icon: "✅",
              color: "bg-white/15",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 ${stat.color}`}
            >
              <span className="text-lg">{stat.icon}</span>
              <div>
                <p className="text-lg font-bold leading-tight">{stat.value}</p>
                <p className="text-xs text-white/70">{stat.label}</p>
              </div>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1 text-xs text-white/50 self-end">
            <AlarmClock className="h-3 w-3" />
            Last updated: {lastRefreshed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      {/* ── Active Proxy Requests ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Active Proxy Requests
              </CardTitle>
              <CardDescription>Pending and accepted proxy requests for today</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs animate-pulse">Live</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loadingRequests ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading requests…</div>
          ) : proxyRequests.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <UserCheck className="h-8 w-8 opacity-30" />
              <p className="text-sm">No active proxy requests for today.</p>
              <p className="text-xs opacity-60">
                The auto-assign cron will create them 5 minutes before each period.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Absent Teacher</TableHead>
                  <TableHead>Proxy Assigned</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {proxyRequests.map((req) => {
                  const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG["PENDING"];
                  return (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium text-sm">{req.requestedByName}</TableCell>
                      <TableCell className="text-sm">{req.requestedToName}</TableCell>
                      <TableCell className="text-sm">{req.subject}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{req.periodDate ?? "—"}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${cfg.cls}`}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {(req.status === "PENDING" || req.status === "ACCEPTED") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-destructive hover:bg-destructive/10"
                            disabled={cancelMutation.isPending}
                            onClick={() => cancelMutation.mutate(req.id)}
                          >
                            Revoke
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Absences + Load side by side on larger screens ─────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Staff Absences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-red-500" />
              Staff Absences Today
            </CardTitle>
            <CardDescription>
              Staff recorded as absent with proxy coverage status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAbsent ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading absences…</div>
            ) : absentStaff.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                <p className="text-sm">No absences recorded today 🎉</p>
              </div>
            ) : (
              <div className="space-y-2">
                {absentStaff.map((s) => (
                  <div
                    key={s.staffUserUuid}
                    className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{s.staffName}</p>
                      <p className="text-xs text-muted-foreground">{s.designation}</p>
                    </div>
                    {s.proxyCovered ? (
                      <Badge className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Covered ✓
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                        Uncovered
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Proxy Load Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-violet-500" />
              Proxy Load Stats
            </CardTitle>
            <CardDescription>Weekly and monthly proxy counts per teacher</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading stats…</div>
            ) : loadStats.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No proxy data available yet.
              </p>
            ) : (
              <div className="space-y-2">
                {loadStats.map((s) => {
                  const maxMonthly = Math.max(...loadStats.map((x) => x.proxiesThisMonth), 1);
                  const pct = Math.round((s.proxiesThisMonth / maxMonthly) * 100);
                  return (
                    <div key={s.staffUserUuid} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{s.staffName}</span>
                        <span className="text-xs text-muted-foreground">
                          {s.proxiesThisWeek} wk / {s.proxiesThisMonth} mo
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-violet-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
