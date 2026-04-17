/**
 * ProxyScheduleBanner
 *
 * Shown on the teacher dashboard when the teacher has pending or accepted
 * proxy (substitute) requests for today.
 *
 * Uses the real GET /api/teacher/proxy-request endpoint.
 * Accept action uses the real POST /api/teacher/proxy-request/accept/{id} endpoint.
 * Peer request creation is shown as disabled (backend pending).
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronUp, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  acceptProxyRequest,
  cancelMyProxyRequest,
  declinePeerProxyRequest,
  listMyProxyRequests,
  type ProxyRequest,
} from "@/services/proxyTeacher";

interface ProxyScheduleBannerProps {
  /** Staff UUID of the currently authenticated teacher */
  staffUuid: string;
}

export default function ProxyScheduleBanner({ staffUuid }: ProxyScheduleBannerProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const { data: requests = [], isLoading } = useQuery<ProxyRequest[]>({
    queryKey: ["proxy-requests-teacher", staffUuid],
    queryFn: listMyProxyRequests,
    staleTime: 60_000,
    enabled: Boolean(staffUuid),
  });

  const pendingForMe = requests.filter(
    (r) => r.requestedToUuid === staffUuid && r.status === "PENDING"
  );
  const acceptedByMe = requests.filter(
    (r) => r.requestedToUuid === staffUuid && r.status === "ACCEPTED"
  );
  const mySentRequests = requests.filter((r) => r.requestedByUuid === staffUuid);

  const acceptMutation = useMutation({
    mutationFn: (id: number) => acceptProxyRequest(id),
    onSuccess: () => {
      toast.success("Proxy request accepted");
      queryClient.invalidateQueries({ queryKey: ["proxy-requests-teacher", staffUuid] });
    },
    onError: () => toast.error("Failed to accept request — please try again"),
  });

  const declineMutation = useMutation({
    mutationFn: (id: number) => declinePeerProxyRequest(id),
    onSuccess: () => {
      toast.success("Proxy request declined");
      queryClient.invalidateQueries({ queryKey: ["proxy-requests-teacher", staffUuid] });
    },
    onError: () => toast.error("Failed to decline request — please try again"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelMyProxyRequest(id),
    onSuccess: () => {
      toast.success("Proxy request cancelled");
      queryClient.invalidateQueries({ queryKey: ["proxy-requests-teacher", staffUuid] });
    },
    onError: () => toast.error("Failed to cancel request — please try again"),
  });

  // Don't render the banner if there's nothing to show
  if (isLoading || requests.length === 0) return null;

  const totalCount = pendingForMe.length + acceptedByMe.length + mySentRequests.length;

  return (
    <Card className="border-blue-500/20 bg-blue-500/5">
      <CardContent className="pt-4 pb-4">
        {/* Banner header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-500" />
            <div>
              <CardTitle className="text-sm font-semibold">
                Proxy Requests
                {pendingForMe.length > 0 && (
                  <Badge className="ml-2 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 text-xs">
                    {pendingForMe.length} pending
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {totalCount} proxy {totalCount === 1 ? "request" : "requests"} today
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Hide" : "Show"}
          </Button>
        </div>

        {/* Expandable list */}
        {expanded && (
          <div className="mt-4 space-y-3">
            {/* Pending requests addressed to me */}
            {pendingForMe.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  AWAITING YOUR ACCEPTANCE
                </p>
                <div className="space-y-2">
                  {pendingForMe.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-background px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{req.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          Requested by:{" "}
                          <span className="font-medium">{req.requestedByName}</span>
                        </p>
                        {req.periodDate && (
                          <p className="text-xs text-muted-foreground">Date: {req.periodDate}</p>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          disabled={acceptMutation.isPending || declineMutation.isPending}
                          onClick={() => acceptMutation.mutate(req.id)}
                        >
                          <Check className="mr-1 h-3.5 w-3.5" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-destructive hover:bg-destructive/10"
                          disabled={acceptMutation.isPending || declineMutation.isPending}
                          onClick={() => declineMutation.mutate(req.id)}
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accepted proxy classes today */}
            {acceptedByMe.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  YOUR PROXY CLASSES TODAY
                </p>
                <div className="space-y-2">
                  {acceptedByMe.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-background px-3 py-2"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{req.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          Covering for:{" "}
                          <span className="font-medium">{req.requestedByName}</span>
                        </p>
                        {req.periodDate && (
                          <p className="text-xs text-muted-foreground">Date: {req.periodDate}</p>
                        )}
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-700 text-xs hover:bg-emerald-500/20">
                        Confirmed
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* My sent requests */}
            {mySentRequests.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  REQUESTS I SENT
                </p>
                <div className="space-y-2">
                  {mySentRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{req.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          To: <span className="font-medium">{req.requestedToName}</span>
                        </p>
                        {req.periodDate && (
                          <p className="text-xs text-muted-foreground">Date: {req.periodDate}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={req.status === "ACCEPTED" ? "default" : req.status === "DECLINED" ? "destructive" : "outline"}
                          className={
                            req.status === "ACCEPTED"
                              ? "bg-emerald-500/10 text-emerald-700 text-xs hover:bg-emerald-500/20"
                              : req.status === "DECLINED"
                              ? "text-xs"
                              : "text-xs text-amber-600"
                          }
                        >
                          {req.status === "ACCEPTED" ? "Accepted" : req.status === "DECLINED" ? "Declined" : "Pending"}
                        </Badge>
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
        )}
      </CardContent>
    </Card>
  );
}
