/**
 * Notification Subscriber — Proxy Teacher System
 *
 * This module defines the interface for sending proxy-related notifications
 * to staff via the school's central notification infrastructure.
 *
 * STATUS: Stub — all actual sends are commented out.
 *
 * Integration plan:
 *   1. The notification server endpoint is at: POST /api/notifications/send
 *      (or via a dedicated notification microservice — TBD per infrastructure).
 *   2. Channels: push (FCM), in-app banner, email (optional).
 *   3. Triggers: proxy assignment, peer request sent/accepted/declined.
 *
 * Replace the TODO stubs below with real `api.post(...)` calls once the
 * backend notification endpoint is available.
 */

// import { api } from "@/lib/axios";

// ── Payload types ─────────────────────────────────────────────────────

export interface ProxyAssignmentNotificationPayload {
  /** Staff UUID of the teacher being assigned as proxy */
  proxyStaffUuid: string;
  /** Staff UUID of the absent teacher being covered */
  absentStaffUuid: string;
  /** Human-readable class + section label e.g. "10-A" */
  classLabel: string;
  /** Subject being covered */
  subject: string;
  /** ISO date string e.g. "2025-01-15" */
  periodDate: string;
  /** Time range e.g. "09:00 – 10:00" */
  periodTime?: string;
  /** Who triggered the assignment: "admin" | "auto" | "peer" */
  assignedBy: "admin" | "auto" | "peer";
}

export interface PeerProxyRequestNotificationPayload {
  /** Staff UUID of the teacher who sent the request */
  fromStaffUuid: string;
  /** Staff UUID of the teacher who should receive it */
  toStaffUuid: string;
  /** Subject being proxied */
  subject: string;
  /** ISO date string */
  periodDate: string;
  /** Proxy request DB id (for deep-link in notification) */
  requestId: number;
}

export interface PeerProxyResponseNotificationPayload {
  requestId: number;
  /** UUID of the teacher who responded */
  respondingStaffUuid: string;
  /** UUID of the teacher who originally sent the request */
  originalRequesterUuid: string;
  accepted: boolean;
}

// ── Notification senders ──────────────────────────────────────────────

/**
 * Notify a teacher that they have been assigned as a proxy.
 * TODO: pending backend notification endpoint
 */
export async function sendProxyAssignmentNotification(
  _payload: ProxyAssignmentNotificationPayload
): Promise<void> {
  // TODO: Uncomment once notification endpoint is available:
  // await api.post("/api/notifications/proxy/assignment", _payload);
  console.info("[NotificationSubscriber] sendProxyAssignmentNotification (stub)", _payload);
}

/**
 * Notify a teacher that a peer proxy request has been sent to them.
 * TODO: pending backend notification endpoint
 */
export async function sendPeerRequestNotification(
  _payload: PeerProxyRequestNotificationPayload
): Promise<void> {
  // TODO: await api.post("/api/notifications/proxy/peer-request", _payload);
  console.info("[NotificationSubscriber] sendPeerRequestNotification (stub)", _payload);
}

/**
 * Notify the original requester that their peer proxy request was accepted or declined.
 * TODO: pending backend notification endpoint
 */
export async function sendPeerResponseNotification(
  _payload: PeerProxyResponseNotificationPayload
): Promise<void> {
  // TODO: await api.post("/api/notifications/proxy/peer-response", _payload);
  console.info("[NotificationSubscriber] sendPeerResponseNotification (stub)", _payload);
}

/**
 * Notify the school admin of a proxy escalation (e.g., request timed out, no one accepted).
 * TODO: pending backend notification endpoint
 */
export async function sendProxyEscalationNotification(
  _params: { absentStaffUuid: string; classLabel: string; periodDate: string }
): Promise<void> {
  // TODO: await api.post("/api/notifications/proxy/escalation", _params);
  console.info("[NotificationSubscriber] sendProxyEscalationNotification (stub)", _params);
}

export const notificationSubscriber = {
  sendProxyAssignmentNotification,
  sendPeerRequestNotification,
  sendPeerResponseNotification,
  sendProxyEscalationNotification,
};
