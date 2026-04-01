import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditService } from '@/features/super-admin/services/superAdminService'
import { ClipboardList, Search, ChevronDown, ChevronRight, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { AuditLogDTO, AuditLogsParams } from '@/features/super-admin/types'

// ── Constants ─────────────────────────────────────────────────────────

const ACTION_OPTIONS = [
  'ALL', 'LOGIN', 'LOGOUT', 'CREATED', 'UPDATED', 'DELETED',
  'ACTIVATED', 'DEACTIVATED', 'PERMISSION_ASSIGNED', 'PERMISSION_REVOKED',
  'CONFIG_CHANGED', 'PASSWORD_RESET', 'FORCE_LOGOUT',
  'BULK_IMPORT_STARTED', 'BULK_IMPORT_COMPLETED', 'BULK_IMPORT_FAILED',
]

const ENTITY_OPTIONS = [
  'ALL', 'Student', 'Staff', 'Role', 'Permission', 'AppConfig',
  'Session', 'Guardian', 'Subject',
]

const ACTION_COLORS: Record<string, string> = {
  CREATED:            'bg-green-100 text-green-700 border-green-200',
  UPDATED:            'bg-blue-100 text-blue-700 border-blue-200',
  DELETED:            'bg-red-100 text-red-700 border-red-200',
  ACTIVATED:          'bg-green-100 text-green-700 border-green-200',
  DEACTIVATED:        'bg-amber-100 text-amber-700 border-amber-200',
  LOGIN:              'bg-violet-100 text-violet-700 border-violet-200',
  LOGOUT:             'bg-gray-100 text-gray-600 border-gray-200',
  PERMISSION_ASSIGNED:'bg-cyan-100 text-cyan-700 border-cyan-200',
  PERMISSION_REVOKED: 'bg-orange-100 text-orange-700 border-orange-200',
  CONFIG_CHANGED:     'bg-purple-100 text-purple-700 border-purple-200',
  PASSWORD_RESET:     'bg-pink-100 text-pink-700 border-pink-200',
  FORCE_LOGOUT:       'bg-red-100 text-red-700 border-red-200',
}

function ActionBadge({ action }: { action: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-semibold', ACTION_COLORS[action] ?? 'bg-muted text-muted-foreground')}
    >
      {action.replace(/_/g, ' ')}
    </Badge>
  )
}

// ── Change Payload Diff ───────────────────────────────────────────────

function ChangePayloadView({ payload }: { payload?: Record<string, unknown> }) {
  if (!payload || Object.keys(payload).length === 0) return null
  const before = (payload.before ?? {}) as Record<string, unknown>
  const after  = (payload.after  ?? {}) as Record<string, unknown>
  const keys   = [...new Set([...Object.keys(before), ...Object.keys(after)])]

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-xs font-mono">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1.5 font-semibold text-muted-foreground">Before</p>
          {keys.map((k) => (
            <div key={k} className={cn('truncate py-0.5', before[k] !== after[k] ? 'text-red-600' : 'text-muted-foreground')}>
              <span className="text-muted-foreground">{k}: </span>
              <span>{before[k] != null ? String(before[k]) : '—'}</span>
            </div>
          ))}
        </div>
        <div>
          <p className="mb-1.5 font-semibold text-muted-foreground">After</p>
          {keys.map((k) => (
            <div key={k} className={cn('truncate py-0.5', before[k] !== after[k] ? 'text-green-600' : 'text-muted-foreground')}>
              <span className="text-muted-foreground">{k}: </span>
              <span>{after[k] != null ? String(after[k]) : '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Row ───────────────────────────────────────────────────────────────

function AuditRow({ log }: { log: AuditLogDTO }) {
  const [expanded, setExpanded] = useState(false)
  const hasPayload = log.changePayload && Object.keys(log.changePayload).length > 0

  return (
    <div className={cn('border-b border-border last:border-0', expanded && 'bg-muted/30')}>
      <button
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
        disabled={!hasPayload}
      >
        {/* Expand toggle */}
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {hasPayload
            ? expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            : <span className="inline-block h-4 w-4" />
          }
        </span>

        {/* Timestamp */}
        <span className="w-36 shrink-0 text-xs text-muted-foreground">
          {new Date(log.timestamp).toLocaleString()}
        </span>

        {/* Actor */}
        <span className="w-28 shrink-0 truncate text-xs font-medium text-foreground">
          {log.actorUsername}
        </span>

        {/* Action */}
        <span className="w-40 shrink-0">
          <ActionBadge action={log.action} />
        </span>

        {/* Entity */}
        <span className="flex-1 truncate text-xs text-foreground">
          <span className="font-medium">{log.entityType}</span>
          {log.entityDisplayName && (
            <span className="text-muted-foreground"> · {log.entityDisplayName}</span>
          )}
        </span>

        {/* IP */}
        <span className="hidden w-28 shrink-0 text-right text-xs text-muted-foreground lg:block">
          {log.ipAddress}
        </span>
      </button>

      {expanded && hasPayload && (
        <div className="px-4 pb-3">
          <ChangePayloadView payload={log.changePayload} />
        </div>
      )}
    </div>
  )
}

// ── CSV Export ────────────────────────────────────────────────────────

function exportCsv(logs: AuditLogDTO[]) {
  const header = 'Timestamp,Actor,Action,EntityType,EntityDisplay,IP\n'
  const rows = logs.map((l) =>
    `"${l.timestamp}","${l.actorUsername}","${l.action}","${l.entityType}","${l.entityDisplayName}","${l.ipAddress}"`
  ).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Main Section ──────────────────────────────────────────────────────

export default function AuditLogsSection() {
  const [page, setPage]             = useState(0)
  const [actor, setActor]           = useState('')
  const [action, setAction]         = useState('ALL')
  const [entityType, setEntityType] = useState('ALL')

  const params: AuditLogsParams = {
    page,
    size: 50,
    ...(actor       ? { actor }      : {}),
    ...(action !== 'ALL'     ? { action }     : {}),
    ...(entityType !== 'ALL' ? { entityType } : {}),
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['super', 'audit-logs', params],
    queryFn: () => auditService.getAuditLogs(params).then((r) => r.data),
    placeholderData: (prev) => prev,
    retry: false,
  })

  const logs = data?.content ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-sm text-muted-foreground">
              Full trail of every system action · Click a row to see before/after diff
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => exportCsv(logs)}
          disabled={logs.length === 0}
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[160px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by actor…"
            className="pl-9 h-9 text-sm"
            value={actor}
            onChange={(e) => { setActor(e.target.value); setPage(0) }}
          />
        </div>
        <Select value={action} onValueChange={(v) => { setAction(v); setPage(0) }}>
          <SelectTrigger className="h-9 w-44 text-sm">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(0) }}>
          <SelectTrigger className="h-9 w-36 text-sm">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_OPTIONS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {/* Header row */}
        <div className="hidden items-center gap-3 border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:flex">
          <span className="w-4 shrink-0" />
          <span className="w-36 shrink-0">Timestamp</span>
          <span className="w-28 shrink-0">Actor</span>
          <span className="w-40 shrink-0">Action</span>
          <span className="flex-1">Entity</span>
          <span className="hidden w-28 shrink-0 text-right lg:block">IP Address</span>
        </div>

        {isLoading ? (
          <div className="space-y-0 divide-y divide-border">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-5 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="py-16 text-center">
            <ClipboardList className="mx-auto mb-3 h-10 w-10 text-destructive/40" />
            <p className="text-sm font-medium text-foreground">Audit log endpoint unavailable</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {(error as any)?.response?.status === 404
                ? 'The /super/audit-logs endpoint returned 404 — confirm the backend route is registered.'
                : 'An error occurred while fetching audit logs. Check the backend connection.'}
            </p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No audit logs match your filters</p>
          </div>
        ) : (
          <div>
            {logs.map((log) => <AuditRow key={log.id} log={log} />)}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {page + 1} of {totalPages} · {data?.totalElements ?? 0} total entries
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >← Prev</Button>
            <Button
              variant="outline" size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >Next →</Button>
          </div>
        </div>
      )}
    </div>
  )
}
