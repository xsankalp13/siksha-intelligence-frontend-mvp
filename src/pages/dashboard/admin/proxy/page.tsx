/**
 * Admin Proxy Management Dashboard
 *
 * Surfaces:
 *  - Today\'s staff absences (GET /api/admin/proxy/absent-staff)
 *  - Active peer proxy requests (GET /api/admin/proxy)
 *  - Proxy load stats per teacher (GET /api/admin/proxy/load-stats)
 *  - Admin assign / reassign / cancel actions
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock, RefreshCw, Users, UserX } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

function TodayDateString() {
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

  // ── Active proxy requests on today ─────────────────────────────────
  const {
    data: proxyRequests = [],
    isLoading: loadingRequests,
    refetch: refetchRequests,
  } = useQuery<ProxyRequest[]>({
    queryKey: ["admin-proxy-requests", today],
    queryFn: () => getActiveProxyRequestsOnDate(today),
    staleTime: 30_000,
  });

  // ── Absent staff today ──────────────────────────────────────────────
  const { data: absentStaff = [], isLoading: loadingAbsent } = useQuery<AbsentStaffDto[]>({
    queryKey: ["admin-proxy-absent", today],
    queryFn: () => getAbsentStaffToday(today),
    staleTime: 30_000,
  });

  // ── Proxy load stats ────────────────────────────────────────────────
  const { data: loadStats = [], isLoading: loadingStats } = useQuery<ProxyLoadStatsDto[]>({
    queryKey: ["admin-proxy-load-stats", today],
    queryFn: () => getProxyLoadStats(today),
    staleTime: 60_000,
  });

  // ── Cancel proxy mutation ───────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: (id: number) => adminCancelProxy(id),
    onSuccess: () => {
      toast.success("Proxy cancelled");
      queryClient.invalidateQueries({ queryKey: ["admin-proxy-requests", today] });
    },
    onError: () => toast.error("Failed to cancel proxy — please try again"),
  });

  const pendingRequests = proxyRequests.filter((r) => r.status === "PENDING");
  const resolvedRequests = proxyRequests.filter((r) => r.status === "ACCEPTED");
  const uncoveredAbsences = absentStaff.filter((s) => !s.proxyCovered);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Proxy Teacher Management</h1>
          <p className="text-sm text-muted-foreground">{TodayDateString()}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchRequests()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{pendingRequests.length}</p>
              <p className="text-xs text-muted-foreground">Pending requests</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{resolvedRequests.length}</p>
              <p className="text-xs text-muted-foreground">Resolved today</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="flex items-center gap-3 pt-5">
            <UserX className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">
                {loadingAbsent ? "…" : uncoveredAbsences.length}
              </p>
              <p className="text-xs text-muted-foreground">Absences uncovered</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Proxy Requests</CardTitle>
              <CardDescription>
                Pending and accepted proxy requests for today
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">Live</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loadingRequests ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading requests…</p>
          ) : proxyRequests.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No active proxy requests for today.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Proxy (To)</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proxyRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="text-sm">{req.requestedByName}</TableCell>
                    <TableCell className="text-sm">{req.requestedToName}</TableCell>
                    <TableCell>{req.subject}</TableCell>
                    <TableCell className="text-xs">{req.periodDate ?? "—"}</TableCell>
                    <TableCell>
                      {req.status === "ACCEPTED" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20">
                          Accepted
                        </Badge>
                      ) : req.status === "DECLINED" ? (
                        <Badge variant="destructive">Declined</Badge>
                      ) : req.status === "CANCELLED" ? (
                        <Badge variant="secondary">Cancelled</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600">
                          Pending
                        </Badge>
                      )}
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
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Absent staff — real data */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Staff Absences Today</CardTitle>
              <CardDescription>
                Staff marked absent with proxy coverage status
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">Live</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loadingAbsent ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading absences…</p>
          ) : absentStaff.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No staff absences recorded for today.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Proxy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {absentStaff.map((s) => (
                  <TableRow key={s.staffUserUuid}>
                    <TableCell className="text-sm font-medium">{s.staffName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.designation}</TableCell>
                    <TableCell className="text-xs">{s.absentDate}</TableCell>
                    <TableCell>
                      {s.proxyCovered ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20">
                          Covered
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600">
                          Uncovered
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Proxy load stats */}
      <Card>
        <CardHeader>
          <CardTitle>Proxy Load Stats</CardTitle>
          <CardDescription>Weekly and monthly proxy counts per teacher</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingStats ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading stats…</p>
          ) : loadStats.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No proxy data available.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead className="text-right">This Week</TableHead>
                  <TableHead className="text-right">This Month</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadStats.map((s) => (
                  <TableRow key={s.staffUserUuid}>
                    <TableCell className="text-sm font-medium">{s.staffName}</TableCell>
                    <TableCell className="text-right">{s.proxiesThisWeek}</TableCell>
                    <TableCell className="text-right">{s.proxiesThisMonth}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
