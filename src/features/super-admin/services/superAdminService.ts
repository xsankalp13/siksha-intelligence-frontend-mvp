import { api } from '@/lib/axios'
import type {
  RoleDTO,
  PermissionDTO,
  RolePermissionLinkDTO,
  AppSettingDTO,
  SettingGroup,
  SettingUpdateRequest,
  SettingsPatchResponse,
  AuditLogDTO,
  AuditLogsParams,
  AppLogsResponse,
  LogLevel,
  ActuatorHealth,
  ActuatorMetric,
  ActuatorHttpExchanges,
  ForceLogoutResponse,
  ResetPasswordResponse,
  GuardianSummaryDto,
  GuardianListParams,
  WhiteLabelConfig,
} from '../types'
import type { PageResponse } from '@/services/admin'

// ── Actuator request helper ───────────────────────────────────────────
// Actuator lives at SERVER ROOT (/actuator/*), not under /api/v1.
// We pass the absolute URL to the main `api` instance so actuator calls
// get the full auth pipeline (token injection + 401 auto-refresh) for free,
// eliminating the need for a separate axios instance and a manual interceptor.

const actuatorOrigin = (() => {
  const envBase = import.meta.env.VITE_API_BASE_URL
  if (envBase && envBase.trim().length > 0) {
    try {
      const u = new URL(envBase.trim())
      return `${u.protocol}//${u.host}` // e.g. https://api.school.edu
    } catch {
      return envBase.trim().split('/api')[0]
    }
  }
  return import.meta.env.DEV ? 'http://localhost:8080' : window.location.origin
})()

const actuatorGet = <T>(path: string, params?: Record<string, string | undefined>) =>
  api.get<T>(`${actuatorOrigin}${path}`, { params })

/** Exported for backward compat with SystemHealthSection imports. */
export const actuatorApi = { get: actuatorGet }


// ── RBAC ─────────────────────────────────────────────────────────────

export const rbacService = {
  /** GET /auth/iam/rbac/roles — list all roles with IDs */
  listRoles: () =>
    api.get<RoleDTO[]>('/auth/iam/rbac/roles'),

  /** GET /auth/iam/rbac/permissions?query= */
  listPermissions: (query?: string) =>
    api.get<PermissionDTO[]>('/auth/iam/rbac/permissions', { params: { query } }),

  /** POST /auth/iam/rbac/permissions */
  createPermission: (name: string) =>
    api.post<PermissionDTO>('/auth/iam/rbac/permissions', { name }),

  /** GET /auth/iam/rbac/roles/{roleId}/permissions */
  listRolePermissions: (roleId: number) =>
    api.get<PermissionDTO[]>(`/auth/iam/rbac/roles/${roleId}/permissions`),

  /** POST /auth/iam/rbac/roles/{roleId}/permissions/{permissionId} — assign */
  assignPermission: (roleId: number, permissionId: number) =>
    api.post<RolePermissionLinkDTO>(
      `/auth/iam/rbac/roles/${roleId}/permissions/${permissionId}`
    ),

  /** DELETE /auth/iam/rbac/roles/{roleId}/permissions/{permissionId} — revoke */
  revokePermission: (roleId: number, permissionId: number) =>
    api.delete<RolePermissionLinkDTO>(
      `/auth/iam/rbac/roles/${roleId}/permissions/${permissionId}`
    ),
}

// ── App Settings ──────────────────────────────────────────────────────

export const settingsService = {
  /** GET /super/settings?group= */
  getSettings: (group?: SettingGroup) =>
    api.get<Record<SettingGroup, AppSettingDTO[]>>('/super/settings', {
      params: group ? { group } : undefined,
    }),

  /** PATCH /super/settings */
  patchSettings: (updates: SettingUpdateRequest[]) =>
    api.patch<SettingsPatchResponse>('/super/settings', updates),

  /** GET /public/settings/whitelabel — no auth, used at app boot */
  getWhiteLabel: () =>
    api.get<WhiteLabelConfig>('/public/settings/whitelabel'),
}

// ── Audit Logs ────────────────────────────────────────────────────────
// Endpoint: GET /super/audit-logs → PageAuditLogResponseDto

export const auditService = {
  /** GET /super/audit-logs?actor=&action=&entityType=&from=&to=&page=&size= */
  getAuditLogs: (params: AuditLogsParams = {}) =>
    api.get<PageResponse<AuditLogDTO>>('/super/audit-logs', { params }),
}

// ── App Logs ──────────────────────────────────────────────────────────

export const logsService = {
  /** GET /super/logs?lines=&level= */
  getAppLogs: (lines = 200, level?: LogLevel) =>
    api.get<AppLogsResponse>('/super/logs', {
      params: { lines, ...(level && level !== 'ALL' ? { level } : {}) },
    }),
}

// ── Actuator / Health ─────────────────────────────────────────────────
// /actuator/health → public (no auth needed, used by load balancers)
// /actuator/metrics/** → auth-protected (JWT required, sent automatically)

export const actuatorService = {
  /** GET /actuator/health — full component detail */
  getHealth: () =>
    actuatorApi.get<ActuatorHealth>('/actuator/health'),

  /** GET /actuator/metrics/{metricName}?tag= */
  getMetric: (name: string, tag?: string) =>
    actuatorApi.get<ActuatorMetric>(
      `/actuator/metrics/${name}`,
      tag ? { tag } : undefined,
    ),

  /** GET /actuator/httpexchanges */
  getHttpExchanges: () =>
    actuatorApi.get<ActuatorHttpExchanges>('/actuator/httpexchanges'),
}

// ── Guardians ─────────────────────────────────────────────────────────
// Endpoint: GET /super/users/guardians → PageGuardianSummaryDto

export const guardianService = {
  /**
   * GET /super/users/guardians
   * Paginated flat list of all guardians with their linked students inline.
   * Params: search, page, size, sortBy, sortDir
   */
  listGuardians: (params: GuardianListParams = {}) =>
    api.get<PageResponse<GuardianSummaryDto>>('/super/users/guardians', { params }),
}

// ── Session / Security ────────────────────────────────────────────────
// All endpoints use the user's UUID (string), NOT the numeric staffId.

export const sessionService = {
  /** POST /super/users/{userUuid}/force-logout — invalidates all sessions for this user */
  forceLogoutUser: (userUuid: string) =>
    api.post<ForceLogoutResponse>(`/super/users/${userUuid}/force-logout`),

  /** POST /super/sessions/invalidate-all — invalidates every active session system-wide */
  forceLogoutAll: () =>
    api.post<ForceLogoutResponse>('/super/sessions/invalidate-all'),

  /**
   * POST /super/users/{userUuid}/reset-password
   * Body: { newPassword?: string }  — if omitted, backend auto-generates and returns temporaryPassword
   */
  resetUserPassword: (userUuid: string, newPassword?: string) =>
    api.post<ResetPasswordResponse>(`/super/users/${userUuid}/reset-password`, {
      ...(newPassword ? { newPassword } : {}),
    }),
}
