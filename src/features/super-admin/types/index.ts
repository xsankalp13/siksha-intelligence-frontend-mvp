// ── SuperAdmin Types ──────────────────────────────────────────────────

import type { PageResponse } from '@/services/admin'
export type { PageResponse }

// ── RBAC ─────────────────────────────────────────────────────────────

export interface RoleDTO {
  id: number
  name: string
}

export interface PermissionDTO {
  id: number
  name: string
  active: boolean
}

export interface RolePermissionLinkDTO {
  roleId: number
  roleName: string
  permissionId: number
  permissionName: string
  message: string
}

// ── App Settings ──────────────────────────────────────────────────────

export type SettingType = 'STRING' | 'ENCRYPTED' | 'BOOLEAN' | 'INTEGER' | 'JSON'
export type SettingGroup = 'SMTP' | 'STORAGE' | 'SECURITY' | 'WHITELABEL' | 'FEATURES'

export interface AppSettingDTO {
  key: string
  value: string
  type: SettingType
  group: SettingGroup
  description: string
  requiresRestart: boolean
  sensitive: boolean
  updatedAt?: string
  updatedBy?: string
}

export interface SettingUpdateRequest {
  key: string
  value: string
}

export interface SettingsPatchResponse {
  saved: number
  restartRequired: boolean
  restartRequiredFor: string[]
}

// ── Audit Logs ────────────────────────────────────────────────────────
// Matches backend AuditLogResponseDto from Swagger

export interface AuditLogDTO {
  id: number
  actorUsername: string
  actorRole: string
  action: string
  entityType: string
  entityId: string
  entityDisplayName: string
  /** JsonNode — can be any JSON object; typically has .before / .after diff keys */
  changePayload?: Record<string, unknown>
  ipAddress: string
  /** ISO-8601 date-time string */
  timestamp: string
}

export interface AuditLogsParams {
  actor?: string
  action?: string
  entityType?: string
  /** ISO-8601 date-time e.g. 2026-03-01T00:00:00Z */
  from?: string
  to?: string
  page?: number
  size?: number
}

// ── App Logs ──────────────────────────────────────────────────────────

export type LogLevel = 'ALL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG'

export interface LogEntryDTO {
  timestamp: string
  level: LogLevel
  logger: string
  thread: string
  message: string
}

export interface AppLogsResponse {
  logFile: string
  totalLinesReturned: number
  entries: LogEntryDTO[]
}

// ── Actuator / Health ─────────────────────────────────────────────────

export interface HealthComponentStatus {
  status: 'UP' | 'DOWN' | 'OUT_OF_SERVICE' | 'UNKNOWN'
  details?: Record<string, unknown>
}

export interface ActuatorHealth {
  status: string
  components?: Record<string, HealthComponentStatus>
}

export interface ActuatorMetricMeasurement {
  statistic: string
  value: number
}

export interface ActuatorMetric {
  name: string
  description?: string
  baseUnit?: string
  measurements: ActuatorMetricMeasurement[]
  availableTags: { tag: string; values: string[] }[]
}

export interface HttpExchange {
  timestamp: string
  request: { method: string; uri: string; remoteAddress?: string }
  response: { status: number; timeTaken?: string }
}

export interface ActuatorHttpExchanges {
  exchanges: HttpExchange[]
}

// ── Session / Security ────────────────────────────────────────────────
// Matches backend MessageResponse schema

export interface ForceLogoutResponse {
  message: string
}

// Matches backend SuperAdminResetPasswordRequestDto
export interface ResetPasswordRequest {
  newPassword?: string
}

// Matches backend SuperAdminResetPasswordResponseDto
export interface ResetPasswordResponse {
  message: string
  /** Only present when the backend auto-generated the password */
  temporaryPassword?: string
}

// ── Guardians ─────────────────────────────────────────────────────────
// Matches backend GuardianLinkedStudentDto

export interface GuardianLinkedStudentDto {
  studentUuid: string
  name: string
  enrollmentNumber?: string
  className?: string
  sectionName?: string
}

// Matches backend GuardianSummaryDto
export interface GuardianSummaryDto {
  guardianUuid: string
  name: string
  username?: string
  email?: string
  phoneNumber?: string
  relation?: string
  occupation?: string
  employer?: string
  primaryContact?: boolean
  active?: boolean
  linkedStudentCount?: number
  linkedStudents?: GuardianLinkedStudentDto[]
}

export interface GuardianListParams {
  search?: string
  page?: number
  size?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

// ── White-label public config ─────────────────────────────────────────

export interface WhiteLabelConfig {
  schoolName: string
  logoUrl: string
  primaryColor: string
  accentColor: string
  timezone: string
  currency: string
  dateFormat: string
  features: {
    finance: boolean
    examination: boolean
    attendance: boolean
    timetableAi: boolean
    bulkImport: boolean
    parentPortal: boolean
    smsNotifications: boolean
  }
}
