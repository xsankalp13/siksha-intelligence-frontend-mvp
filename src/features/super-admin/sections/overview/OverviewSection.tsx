import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { actuatorService, auditService } from '@/features/super-admin/services/superAdminService'
import { adminService } from '@/services/admin'
import {
  LayoutDashboard, Activity, Users, ShieldCheck, ClipboardList,
  Terminal, Settings2, ArrowRight, Wifi, WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// ── Quick Nav Cards ───────────────────────────────────────────────────

const QUICK_NAV = [
  { label: 'System Health',  description: 'Live metrics & status',   path: 'health',         icon: Activity,      color: 'bg-green-100 text-green-700' },
  { label: 'Roles & RBAC',   description: 'Manage permissions',      path: 'rbac',           icon: ShieldCheck,   color: 'bg-violet-100 text-violet-700' },
  { label: 'Configuration',  description: 'SMTP, storage, flags',    path: 'configuration',  icon: Settings2,     color: 'bg-blue-100 text-blue-700' },
  { label: 'Audit Logs',     description: 'Full activity trail',     path: 'audit-logs',     icon: ClipboardList, color: 'bg-amber-100 text-amber-700' },
  { label: 'App Logs',       description: 'Live log stream',         path: 'logs',           icon: Terminal,      color: 'bg-zinc-100 text-zinc-700' },
  { label: 'Users',          description: 'Staff & students',        path: 'users',          icon: Users,         color: 'bg-cyan-100 text-cyan-700' },
]

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(' ')
}

function getMeasurement(
  measurements: { statistic: string; value: number }[],
  stat: string
): number {
  return measurements.find((m) => m.statistic === stat)?.value ?? 0
}

// ── Main Section ──────────────────────────────────────────────────────

export default function OverviewSection() {
  const navigate = useNavigate()

  const { data: health }  = useQuery({
    queryKey: ['super', 'actuator', 'health'],
    queryFn:  () => actuatorService.getHealth().then((r) => r.data),
    refetchInterval: 30_000,
  })

  const { data: uptime }  = useQuery({
    queryKey: ['super', 'metrics', 'process.uptime'],
    queryFn:  () => actuatorService.getMetric('process.uptime').then((r) => r.data),
    refetchInterval: 60_000,
  })

  const { data: staffPage } = useQuery({
    queryKey: ['admin', 'staff', 'overview'],
    queryFn:  () => adminService.listStaff({ size: 1 }).then((r) => r.data),
  })

  const { data: studentPage } = useQuery({
    queryKey: ['admin', 'students', 'overview'],
    queryFn:  () => adminService.listStudents({ size: 1 }).then((r) => r.data),
  })

  const { data: recentLogs } = useQuery({
    queryKey: ['super', 'audit-logs', 'overview'],
    queryFn:  () => auditService.getAuditLogs({ size: 5 }).then((r) => r.data),
  })

  const isUp       = health?.status === 'UP'
  const uptimeVal  = getMeasurement(uptime?.measurements ?? [], 'VALUE')
  const totalStaff = staffPage?.totalElements ?? 0
  const totalStudents = studentPage?.totalElements ?? 0
  const recentActivity = recentLogs?.content ?? []

  const KPI_CARDS = [
    {
      label: 'System Status',
      value: health?.status ?? 'LOADING',
      sub:   isUp ? `Up for ${formatUptime(uptimeVal)}` : 'Degraded — check Health page',
      color: isUp ? 'text-green-600' : 'text-red-600',
      bg:    isUp ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200',
      icon:  isUp ? Wifi : WifiOff,
    },
    {
      label: 'Total Staff',
      value: String(totalStaff),
      sub:   'All staff accounts',
      color: 'text-primary',
      bg:    'bg-primary/5 border-primary/20',
      icon:  Users,
    },
    {
      label: 'Total Students',
      value: String(totalStudents),
      sub:   'All enrolled students',
      color: 'text-cyan-600',
      bg:    'bg-cyan-50 border-cyan-200',
      icon:  Users,
    },
    {
      label: 'Recent Actions',
      value: String(recentLogs?.totalElements ?? 0),
      sub:   'Total audit log entries',
      color: 'text-amber-600',
      bg:    'bg-amber-50 border-amber-200',
      icon:  ClipboardList,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <LayoutDashboard className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SuperAdmin Overview</h1>
          <p className="text-sm text-muted-foreground">
            System status at a glance
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map(({ label, value, sub, color, bg, icon: Icon }) => (
          <div key={label} className={cn('rounded-xl border p-5 shadow-sm', bg)}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon className={cn('h-4 w-4', color)} />
            </div>
            <p className={cn('text-2xl font-bold', color)}>{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Navigation */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Access
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_NAV.map(({ label, description, path, icon: Icon, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground truncate">{description}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Activity
          </h2>
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate('audit-logs')}>
            View all <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        <div className="rounded-xl border border-border bg-card shadow-sm">
          {recentActivity.length === 0 ? (
            <div className="py-10 text-center">
              <ClipboardList className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No audit log entries yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentActivity.map((log) => (
                <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                    {log.actorUsername.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      <span className="font-medium">{log.actorUsername}</span>
                      {' '}{log.action.replace(/_/g, ' ').toLowerCase()}{' '}
                      <span className="text-muted-foreground">{log.entityType}</span>
                      {log.entityDisplayName && `: ${log.entityDisplayName}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
