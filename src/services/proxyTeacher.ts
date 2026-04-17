/**
 * Proxy Teacher Service
 *
 * Manages teacher proxy (substitute) requests and assignments.
 *
 * Teacher endpoints:
 *   GET    /api/teacher/proxy-request               — list my proxy requests (sent + received)
 *   GET    /api/teacher/proxy-request/today          — today's proxy schedule for current teacher
 *   POST   /api/teacher/proxy-request               — create a peer proxy request
 *   POST   /api/teacher/proxy-request/accept/{id}   — accept a request
 *   POST   /api/teacher/proxy-request/decline/{id}  — decline a request
 *   DELETE /api/teacher/proxy-request/{id}          — cancel my own request
 *
 * Admin endpoints (require ROLE_ADMIN / ROLE_SCHOOL_ADMIN / ROLE_SUPER_ADMIN):
 *   GET    /api/admin/proxy                         — all active requests on a date
 *   POST   /api/admin/proxy/assign                  — directly assign a proxy
 *   PUT    /api/admin/proxy/{id}/reassign            — reassign to a different teacher
 *   DELETE /api/admin/proxy/{id}                    — cancel a proxy assignment
 *   GET    /api/admin/proxy/absent-staff?date=…     — staff absent on a date
 *   GET    /api/admin/proxy/load-stats?date=…       — proxy load per teacher
 *
 * Stubs (no backend algorithm planned yet):
 *   getEligibleProxies, autoAssignProxy
 */

import { api } from "@/lib/axios";

// ── Types ─────────────────────────────────────────────────────────────

export type ProxyRequestStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";

/** Maps to backend ProxyRequestResponseDto */
export interface ProxyRequest {
  id: number;
  uuid: string;
  requestedByUuid: string;
  requestedByName: string;
  requestedToUuid: string;
  requestedToName: string;
  subject: string;
  periodDate: string | null;   // "YYYY-MM-DD"
  sectionUuid: string | null;
  status: ProxyRequestStatus;
  isAccepted: boolean;
  declineReason: string | null;
  createdAt: string;           // ISO-8601
}

/** Maps to backend AbsentStaffDto */
export interface AbsentStaffDto {
  staffUserUuid: string;
  staffName: string;
  designation: string;
  absentDate: string;    // "YYYY-MM-DD"
  proxyCovered: boolean;
}

/** Maps to backend ProxyLoadStatsDto */
export interface ProxyLoadStatsDto {
  staffUserUuid: string;
  staffName: string;
  proxiesThisWeek: number;
  proxiesThisMonth: number;
}

/** Body for creating a peer proxy request */
export interface ProxyRequestCreatePayload {
  requestedToUserUuid: string;
  subject: string;
  periodDate?: string;    // "YYYY-MM-DD", defaults to today on the backend
  sectionUuid?: string;
}

/** Body for admin direct assignment */
export interface AdminAssignProxyPayload {
  absentStaffUserUuid: string;
  proxyStaffUserUuid: string;
  periodDate: string;       // "YYYY-MM-DD"
  sectionUuid?: string;
  subject: string;
}

// ── Teacher endpoints ─────────────────────────────────────────────────

/**
 * List proxy requests for the currently authenticated teacher (sent + received).
 * GET /api/teacher/proxy-request
 */
export async function listMyProxyRequests(): Promise<ProxyRequest[]> {
  const res = await api.get<ProxyRequest[]>("/api/teacher/proxy-request");
  return res.data;
}

/**
 * Get accepted proxy classes the current teacher is covering today.
 * GET /api/teacher/proxy-request/today
 */
export async function getMyProxyScheduleToday(): Promise<ProxyRequest[]> {
  const res = await api.get<ProxyRequest[]>("/api/teacher/proxy-request/today");
  return res.data;
}

/**
 * Create a new peer proxy request from the current teacher to another teacher.
 * POST /api/teacher/proxy-request
 */
export async function createPeerProxyRequest(
  payload: ProxyRequestCreatePayload
): Promise<ProxyRequest> {
  const res = await api.post<ProxyRequest>("/api/teacher/proxy-request", payload);
  return res.data;
}

/**
 * Accept a proxy request addressed to the current teacher.
 * POST /api/teacher/proxy-request/accept/{requestId}
 */
export async function acceptProxyRequest(requestId: number): Promise<ProxyRequest> {
  const res = await api.post<ProxyRequest>(`/api/teacher/proxy-request/accept/${requestId}`);
  return res.data;
}

/**
 * Decline a proxy request addressed to the current teacher.
 * POST /api/teacher/proxy-request/decline/{requestId}
 */
export async function declinePeerProxyRequest(
  requestId: number,
  reason?: string
): Promise<ProxyRequest> {
  const res = await api.post<ProxyRequest>(
    `/api/teacher/proxy-request/decline/${requestId}`,
    reason ? { reason } : {}
  );
  return res.data;
}

/**
 * Cancel a proxy request the current teacher originally sent.
 * DELETE /api/teacher/proxy-request/{requestId}
 */
export async function cancelMyProxyRequest(requestId: number): Promise<ProxyRequest> {
  const res = await api.delete<ProxyRequest>(`/api/teacher/proxy-request/${requestId}`);
  return res.data;
}

// ── Admin endpoints ───────────────────────────────────────────────────

/**
 * List all active (PENDING or ACCEPTED) proxy requests on a date.
 * GET /api/admin/proxy?date=YYYY-MM-DD
 */
export async function getActiveProxyRequestsOnDate(date: string): Promise<ProxyRequest[]> {
  const res = await api.get<ProxyRequest[]>("/api/admin/proxy", { params: { date } });
  return res.data;
}

/**
 * Admin directly assigns a proxy teacher for an absent teacher.
 * POST /api/admin/proxy/assign
 */
export async function adminAssignProxy(payload: AdminAssignProxyPayload): Promise<ProxyRequest> {
  const res = await api.post<ProxyRequest>("/api/admin/proxy/assign", payload);
  return res.data;
}

/**
 * Reassign an existing proxy to a different teacher.
 * PUT /api/admin/proxy/{requestId}/reassign
 */
export async function adminReassignProxy(
  requestId: number,
  newProxyUserUuid: string
): Promise<ProxyRequest> {
  const res = await api.put<ProxyRequest>(`/api/admin/proxy/${requestId}/reassign`, {
    newProxyUserUuid,
  });
  return res.data;
}

/**
 * Cancel / remove a proxy assignment (admin only).
 * DELETE /api/admin/proxy/{requestId}
 */
export async function adminCancelProxy(requestId: number): Promise<ProxyRequest> {
  const res = await api.delete<ProxyRequest>(`/api/admin/proxy/${requestId}`);
  return res.data;
}

/**
 * Get staff members absent on a given date with proxy coverage flag.
 * GET /api/admin/proxy/absent-staff?date=YYYY-MM-DD
 */
export async function getAbsentStaffToday(date: string): Promise<AbsentStaffDto[]> {
  const res = await api.get<AbsentStaffDto[]>("/api/admin/proxy/absent-staff", {
    params: { date },
  });
  return res.data;
}

/**
 * Get proxy load statistics (weekly + monthly counts) per teacher.
 * GET /api/admin/proxy/load-stats?date=YYYY-MM-DD
 */
export async function getProxyLoadStats(date: string): Promise<ProxyLoadStatsDto[]> {
  const res = await api.get<ProxyLoadStatsDto[]>("/api/admin/proxy/load-stats", {
    params: { date },
  });
  return res.data;
}

// ── Stubs (no backend algorithm planned) ─────────────────────────────

/**
 * Get eligible proxy teachers for a period (schedule + load-based).
 * Not yet implemented — algorithm not planned.
 */
export async function getEligibleProxies(
  _params: { absentStaffUuid: string; periodDate: string; sectionUuid: string }
): Promise<ProxyLoadStatsDto[]> {
  return [];
}

/**
 * Auto-assign proxy across eligible teachers.
 * Not yet implemented — algorithm not planned.
 */
export async function autoAssignProxy(
  _params: { absentStaffUuid: string; periodDate: string; sectionUuid: string }
): Promise<void> {
  throw new Error("autoAssignProxy: algorithm not yet implemented");
}

export const proxyTeacherService = {
  listMyProxyRequests,
  getMyProxyScheduleToday,
  createPeerProxyRequest,
  acceptProxyRequest,
  declinePeerProxyRequest,
  cancelMyProxyRequest,
  getActiveProxyRequestsOnDate,
  adminAssignProxy,
  adminReassignProxy,
  adminCancelProxy,
  getAbsentStaffToday,
  getProxyLoadStats,
  getEligibleProxies,
  autoAssignProxy,
};
