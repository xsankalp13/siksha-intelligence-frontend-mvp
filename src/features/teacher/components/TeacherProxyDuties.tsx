/**
 * TeacherProxyDuties
 *
 * Three sub-tabs rendered inside the My HR → Proxy Duties tab:
 *   1. Request Proxy  — form to send a substitute request to another teacher
 *   2. My Duties      — PENDING / ACCEPTED requests I need to cover (with Accept / Decline)
 *   3. History        — all closed requests (sent + received)
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  acceptProxyRequest,
  cancelMyProxyRequest,
  createPeerProxyRequest,
  declinePeerProxyRequest,
  listMyProxyRequests,
  type ProxyRequest,
  type ProxyRequestStatus,
} from "@/services/proxyTeacher";
import { adminService, type StaffSummaryDTO } from "@/services/admin";

// ── helpers ──────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}

function StatusBadge({ status }: { status: ProxyRequestStatus }) {
  switch (status) {
    case "ACCEPTED":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-700 text-xs hover:bg-emerald-500/20">
          Accepted
        </Badge>
      );
    case "DECLINED":
      return <Badge variant="destructive" className="text-xs">Declined</Badge>;
    case "CANCELLED":
      return <Badge variant="secondary" className="text-xs">Cancelled</Badge>;
    default:
      return (
        <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
          Pending
        </Badge>
      );
  }
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── Request Proxy tab ─────────────────────────────────────────────────────────

function RequestProxyTab({ staffUuid, onSuccess }: { staffUuid: string; onSuccess: () => void }) {
  const [toUuid, setToUuid] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(today());
  const [search, setSearch] = useState("");

  const { data: staffPage } = useQuery({
    queryKey: ["staff-list-for-proxy"],
    queryFn: () =>
      adminService
        .listStaff({ staffType: "TEACHER", size: 200 })
        .then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const teachers: StaffSummaryDTO[] = (staffPage?.content ?? []).filter(
    (s) => s.uuid !== staffUuid && s.active
  );

  const filtered = search.trim()
    ? teachers.filter((t) =>
        `${t.firstName} ${t.lastName}`.toLowerCase().includes(search.toLowerCase())
      )
    : teachers;

  const mutation = useMutation({
    mutationFn: () =>
      createPeerProxyRequest({ requestedToUserUuid: toUuid, subject, periodDate: date }),
    onSuccess: () => {
      toast.success("Proxy request sent");
      setToUuid("");
      setSubject("");
      setDate(today());
      setSearch("");
      onSuccess();
    },
    onError: () => toast.error("Failed to send request — please try again"),
  });

  const canSubmit = toUuid && subject.trim() && date;

  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        <div className="space-y-1.5">
          <Label>Search Teacher</Label>
          <Input
            placeholder="Type a name to filter…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Select Teacher</Label>
          <Select value={toUuid} onValueChange={setToUuid}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a teacher" />
            </SelectTrigger>
            <SelectContent>
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">No teachers found</div>
              ) : (
                filtered.map((t) => (
                  <SelectItem key={t.uuid} value={t.uuid}>
                    {t.firstName} {t.lastName}
                    {t.jobTitle ? (
                      <span className="ml-1.5 text-xs text-muted-foreground">({t.jobTitle})</span>
                    ) : null}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Subject / Period</Label>
          <Input
            placeholder="e.g. Mathematics – Period 3"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <Button
          className="w-full"
          disabled={!canSubmit || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Send Proxy Request
        </Button>
      </CardContent>
    </Card>
  );
}

// ── My Duties tab ─────────────────────────────────────────────────────────────

function MyDutiesTab({
  requests,
  staffUuid,
  isLoading,
}: {
  requests: ProxyRequest[];
  staffUuid: string;
  isLoading: boolean;
}) {
  const queryClient = useQueryClient();

  const incoming = requests.filter(
    (r) => r.requestedToUuid === staffUuid && (r.status === "PENDING" || r.status === "ACCEPTED")
  );

  const acceptMutation = useMutation({
    mutationFn: (id: number) => acceptProxyRequest(id),
    onSuccess: () => {
      toast.success("Request accepted");
      queryClient.invalidateQueries({ queryKey: ["proxy-requests-teacher", staffUuid] });
    },
    onError: () => toast.error("Failed to accept — please try again"),
  });

  const declineMutation = useMutation({
    mutationFn: (id: number) => declinePeerProxyRequest(id),
    onSuccess: () => {
      toast.success("Request declined");
      queryClient.invalidateQueries({ queryKey: ["proxy-requests-teacher", staffUuid] });
    },
    onError: () => toast.error("Failed to decline — please try again"),
  });

  const isBusy = acceptMutation.isPending || declineMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (incoming.length === 0) {
    return <EmptyState message="No active proxy duties right now." />;
  }

  return (
    <div className="space-y-2">
      {incoming.map((req) => (
        <div
          key={req.id}
          className={`flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-3 ${
            req.status === "ACCEPTED" ? "border-emerald-500/20" : "border-amber-500/20"
          }`}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{req.subject}</p>
            <p className="text-xs text-muted-foreground">
              From: <span className="font-medium">{req.requestedByName}</span>
            </p>
            {req.periodDate && (
              <p className="text-xs text-muted-foreground">Date: {req.periodDate}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {req.status === "PENDING" ? (
              <>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={isBusy}
                  onClick={() => acceptMutation.mutate(req.id)}
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                  disabled={isBusy}
                  onClick={() => declineMutation.mutate(req.id)}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Decline
                </Button>
              </>
            ) : (
              <Badge className="bg-emerald-500/10 text-emerald-700 text-xs">Confirmed</Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── History tab ───────────────────────────────────────────────────────────────

function HistoryTab({
  requests,
  staffUuid,
  isLoading,
}: {
  requests: ProxyRequest[];
  staffUuid: string;
  isLoading: boolean;
}) {
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelMyProxyRequest(id),
    onSuccess: () => {
      toast.success("Request cancelled");
      queryClient.invalidateQueries({ queryKey: ["proxy-requests-teacher", staffUuid] });
    },
    onError: () => toast.error("Failed to cancel — please try again"),
  });

  // History = all requests not currently in active duty state
  const history = requests.filter(
    (r) =>
      !(r.requestedToUuid === staffUuid && (r.status === "PENDING" || r.status === "ACCEPTED"))
  );

  const received = history.filter((r) => r.requestedToUuid === staffUuid);
  const sent = history.filter((r) => r.requestedByUuid === staffUuid);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (history.length === 0) {
    return <EmptyState message="No proxy history yet." />;
  }

  return (
    <div className="space-y-5">
      {received.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Received
          </p>
          <div className="space-y-2">
            {received.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{req.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    From: <span className="font-medium">{req.requestedByName}</span>
                  </p>
                  {req.periodDate && (
                    <p className="text-xs text-muted-foreground">Date: {req.periodDate}</p>
                  )}
                </div>
                <StatusBadge status={req.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {sent.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sent
          </p>
          <div className="space-y-2">
            {sent.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{req.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    To: <span className="font-medium">{req.requestedToName}</span>
                  </p>
                  {req.periodDate && (
                    <p className="text-xs text-muted-foreground">Date: {req.periodDate}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <StatusBadge status={req.status} />
                  {req.status === "PENDING" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      disabled={cancelMutation.isPending}
                      onClick={() => cancelMutation.mutate(req.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function TeacherProxyDuties({ staffUuid }: { staffUuid: string }) {
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery<ProxyRequest[]>({
    queryKey: ["proxy-requests-teacher", staffUuid],
    queryFn: listMyProxyRequests,
    staleTime: 60_000,
    enabled: Boolean(staffUuid),
  });

  const pendingCount = requests.filter(
    (r) => r.requestedToUuid === staffUuid && r.status === "PENDING"
  ).length;

  return (
    <Tabs defaultValue="duties" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="request">Request Proxy</TabsTrigger>
        <TabsTrigger value="duties" className="relative">
          My Duties
          {pendingCount > 0 && (
            <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
              {pendingCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="request">
        <RequestProxyTab
          staffUuid={staffUuid}
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["proxy-requests-teacher", staffUuid] })
          }
        />
      </TabsContent>

      <TabsContent value="duties">
        <MyDutiesTab requests={requests} staffUuid={staffUuid} isLoading={isLoading} />
      </TabsContent>

      <TabsContent value="history">
        <HistoryTab requests={requests} staffUuid={staffUuid} isLoading={isLoading} />
      </TabsContent>
    </Tabs>
  );
}
