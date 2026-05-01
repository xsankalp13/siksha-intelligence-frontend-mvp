import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlarmClock,
  CheckCircle2,
  Clock,
  Loader2,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type { LateClockInRequestDTO, LateClockInStatus } from "@/services/types/hrms";
import EmptyState from "@/features/hrms/components/EmptyState";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";

const STATUS_COLORS: Record<LateClockInStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

function minutesToHuman(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function LateBar({ minutes }: { minutes: number }) {
  const pct = Math.min(100, (minutes / 240) * 100); // max scale 4 hours
  const color =
    minutes <= 30 ? "bg-amber-400" : minutes <= 90 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function LateClockInReview() {
  const qc = useQueryClient();
  const { formatDate } = useHrmsFormatters();

  const [tab, setTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [reviewTarget, setReviewTarget] = useState<{ req: LateClockInRequestDTO; action: "APPROVE" | "REJECT" } | null>(null);
  const [remarks, setRemarks] = useState("");

  const { data: pending } = useQuery({
    queryKey: ["hrms", "late-clockin", "pending-count"],
    queryFn: () => hrmsService.getLateClockInPendingCount().then((r) => r.data.pending),
    refetchInterval: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["hrms", "late-clockin", tab],
    queryFn: () =>
      hrmsService
        .listLateClockInRequests({ status: tab, size: 50 })
        .then((r) => r.data.content ?? []),
  });

  const reviewMutation = useMutation({
    mutationFn: () =>
      hrmsService.reviewLateClockIn(reviewTarget!.req.uuid, {
        action: reviewTarget!.action,
        remarks: remarks.trim() || undefined,
      }),
    onSuccess: () => {
      const label = reviewTarget!.action === "APPROVE" ? "approved" : "rejected";
      toast.success(`Late clock-in ${label} successfully`);
      qc.invalidateQueries({ queryKey: ["hrms", "late-clockin"] });
      setReviewTarget(null);
      setRemarks("");
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const requests: LateClockInRequestDTO[] = data ?? [];

  const renderCard = (req: LateClockInRequestDTO) => (
    <Card key={req.uuid} className="overflow-hidden">
      <CardContent className="p-0">
        {/* Colored top accent */}
        <div
          className={`h-1.5 w-full ${
            req.minutesLate > 90
              ? "bg-red-500"
              : req.minutesLate > 30
              ? "bg-orange-400"
              : "bg-amber-400"
          }`}
        />
        <div className="flex flex-wrap items-start justify-between gap-3 p-4">
          {/* Left — Staff Info */}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">{req.staffName || "—"}</p>
              {req.employeeId && (
                <span className="text-xs text-muted-foreground">({req.employeeId})</span>
              )}
              <Badge variant="secondary" className={STATUS_COLORS[req.status]}>
                {req.status}
              </Badge>
            </div>
            {req.designation && (
              <p className="text-xs text-muted-foreground">{req.designation}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(req.attendanceDate)}
              </span>
              {req.clockInTime && (
                <span className="flex items-center gap-1">
                  Clocked in: <strong>{req.clockInTime}</strong>
                </span>
              )}
            </div>

            {/* Late duration + bar */}
            <div className="mt-2 max-w-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Late duration</span>
                <span
                  className={`font-bold ${
                    req.minutesLate > 90
                      ? "text-red-600"
                      : req.minutesLate > 30
                      ? "text-orange-600"
                      : "text-amber-600"
                  }`}
                >
                  {minutesToHuman(req.minutesLate)}
                </span>
              </div>
              <LateBar minutes={req.minutesLate} />
            </div>

            {req.reason && (
              <div className="mt-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs italic text-muted-foreground">
                "{req.reason}"
              </div>
            )}
            {req.adminRemarks && (
              <div className="mt-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Admin: </span>
                {req.adminRemarks}
              </div>
            )}
          </div>

          {/* Right — Actions (only for PENDING) */}
          {req.status === "PENDING" && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                size="sm"
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                onClick={() => {
                  setReviewTarget({ req, action: "APPROVE" });
                  setRemarks("");
                }}
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => {
                  setReviewTarget({ req, action: "REJECT" });
                  setRemarks("");
                }}
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5">
      {/* ── Hero Banner ───────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              ⏰
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Late Clock-In Review</h2>
              <p className="text-sm text-white/70">
                Review and resolve staff attendance exceptions
              </p>
            </div>
          </div>
          {(pending ?? 0) > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-white/20 px-3 py-1.5 border border-white/30 animate-pulse">
              <AlarmClock className="h-4 w-4" />
              <span className="text-sm font-bold">{pending} Pending</span>
            </div>
          )}
        </div>

        {/* Quick-stats strip */}
        <div className="relative mt-4 flex flex-wrap gap-3">
          {[
            { label: "Pending", value: pending ?? 0, color: "bg-amber-400/30 border-amber-400/40" },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-lg border px-4 py-2 text-center ${stat.color}`}
            >
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-xs text-white/80">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="PENDING">
            Pending
            {(pending ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs bg-amber-100 text-amber-800">
                {pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>

        {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
          <TabsContent key={s} value={s} className="mt-4 space-y-3">
            {isLoading && tab === s ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : requests.length === 0 ? (
              <EmptyState
                icon={UserCheck}
                title={
                  s === "PENDING"
                    ? "No pending requests"
                    : s === "APPROVED"
                    ? "No approved requests"
                    : "No rejected requests"
                }
                description={
                  s === "PENDING"
                    ? "All late clock-in exceptions have been reviewed."
                    : "Records will appear here after review."
                }
              />
            ) : (
              requests.map(renderCard)
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* ── Review Dialog ─────────────────────────────────────────────── */}
      <ReviewDialog
        open={!!reviewTarget}
        onOpenChange={(o) => !o && setReviewTarget(null)}
        title={
          reviewTarget?.action === "APPROVE"
            ? "Approve Late Clock-In"
            : "Reject Late Clock-In"
        }
        description={
          reviewTarget?.action === "APPROVE"
            ? `Approving will upgrade ${reviewTarget.req.staffName}'s attendance to PRESENT for ${formatDate(reviewTarget.req.attendanceDate)}.`
            : `Rejecting will keep the current attendance status (Late / Half-Day) for ${reviewTarget?.req.staffName}.`
        }
        severity={reviewTarget?.action === "APPROVE" ? "info" : "danger"}
        confirmLabel={reviewTarget?.action === "APPROVE" ? "Approve" : "Reject"}
        onConfirm={() => reviewMutation.mutate()}
        isPending={reviewMutation.isPending}
      >
        <div className="space-y-3">
          {reviewTarget && (
            <div className="rounded-lg bg-muted p-3 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Staff</span>
                <span className="font-medium">
                  {reviewTarget.req.staffName} ({reviewTarget.req.employeeId})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{formatDate(reviewTarget.req.attendanceDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Late By</span>
                <span className="font-bold text-orange-600">
                  {minutesToHuman(reviewTarget.req.minutesLate)}
                </span>
              </div>
              {reviewTarget.req.clockInTime && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clock-In Time</span>
                  <span className="font-medium">{reviewTarget.req.clockInTime}</span>
                </div>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label>
              Remarks{" "}
              {reviewTarget?.action === "REJECT" && (
                <span className="text-destructive">*</span>
              )}
            </Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                reviewTarget?.action === "APPROVE"
                  ? "Optional — e.g. transport delay, emergency"
                  : "Required — state the reason for rejection"
              }
              rows={2}
            />
          </div>
        </div>
      </ReviewDialog>
    </div>
  );
}
