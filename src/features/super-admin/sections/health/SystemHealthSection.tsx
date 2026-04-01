import { useQuery } from '@tanstack/react-query'
import { actuatorService } from '@/features/super-admin/services/superAdminService'
import { Activity, Database, HardDrive, Cpu, Clock, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { HealthComponentStatus } from '@/features/super-admin/types'

// ── Helpers ───────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(' ')
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(0)} MB`
}

function getMeasurement(measurements: { statistic: string; value: number }[], stat: string) {
  return measurements.find((m) => m.statistic === stat)?.value ?? 0
}

// ── Sub-components ────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const isUp = status === 'UP'
  return (
    <span className="relative flex h-2.5 w-2.5">
      {isUp && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
      )}
      <span
        className={cn(
          'relative inline-flex h-2.5 w-2.5 rounded-full',
          isUp ? 'bg-green-500' : 'bg-red-500'
        )}
      />
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const isUp = status === 'UP'
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 font-semibold',
        isUp
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-red-200 bg-red-50 text-red-700'
      )}
    >
      <StatusDot status={status} />
      {status}
    </Badge>
  )
}

interface MetricCardProps {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  loading?: boolean
  error?: boolean
}

function MetricCard({ title, icon: Icon, children, loading, error }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      ) : error ? (
        <p className="text-sm text-muted-foreground">Unable to fetch metric</p>
      ) : (
        children
      )}
    </div>
  )
}

function ProgressBar({ value, max, colorClass = 'bg-primary' }: { value: number; max: number; colorClass?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatBytes(value)}</span>
        <span>{pct}%</span>
        <span>{formatBytes(max)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-2 rounded-full transition-all duration-500', colorClass,
            pct > 85 ? 'bg-red-500' : pct > 65 ? 'bg-amber-500' : 'bg-green-500'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Main Section ──────────────────────────────────────────────────────

export default function SystemHealthSection() {
  // Shared config for all actuator metric queries:
  // - retry:false prevents the 401 storm (no retries on auth failure)
  // - refetchIntervalInBackground:false stops polling when tab is hidden
  const metricQueryDefaults = {
    retry: false,
    refetchIntervalInBackground: false,
  } as const

  // Core health — public endpoint, no auth needed
  const { data: health, isLoading: healthLoading, isError: healthError, error: healthFetchError, refetch: refetchHealth, dataUpdatedAt } = useQuery({
    queryKey: ['super', 'actuator', 'health'],
    queryFn: () => actuatorService.getHealth().then((r) => r.data),
    refetchInterval: 30_000,
    ...metricQueryDefaults,
  })

  // JVM heap — auth-protected, requires SUPER_ADMIN JWT
  const { data: heapUsed } = useQuery({
    queryKey: ['super', 'metrics', 'jvm.memory.used', 'heap'],
    queryFn: () => actuatorService.getMetric('jvm.memory.used', 'area:heap').then((r) => r.data),
    refetchInterval: 30_000,
    ...metricQueryDefaults,
  })
  const { data: heapMax } = useQuery({
    queryKey: ['super', 'metrics', 'jvm.memory.max', 'heap'],
    queryFn: () => actuatorService.getMetric('jvm.memory.max', 'area:heap').then((r) => r.data),
    refetchInterval: 30_000,
    ...metricQueryDefaults,
  })

  // Uptime — auth-protected
  const { data: uptimeMetric } = useQuery({
    queryKey: ['super', 'metrics', 'process.uptime'],
    queryFn: () => actuatorService.getMetric('process.uptime').then((r) => r.data),
    refetchInterval: 60_000,
    ...metricQueryDefaults,
  })

  // HTTP request metrics — auth-protected.
  // Spring only creates the `status:500` tag after an actual 500 occurs,
  // so we use `outcome:SERVER_ERROR` which Spring always registers, and
  // catch 404 from actuator (= "no data yet") returning null (treated as 0).
  const { data: httpRequests } = useQuery({
    queryKey: ['super', 'metrics', 'http.server.requests', 'total'],
    queryFn: () =>
      actuatorService
        .getMetric('http.server.requests')
        .then((r) => r.data)
        .catch((err: unknown) => {
          if ((err as any)?.response?.status === 404) return null
          throw err
        }),
    refetchInterval: 30_000,
    ...metricQueryDefaults,
  })
  const { data: httpErrors } = useQuery({
    queryKey: ['super', 'metrics', 'http.server.requests', 'server-error'],
    queryFn: () =>
      actuatorService
        .getMetric('http.server.requests', 'outcome:SERVER_ERROR')
        .then((r) => r.data)
        .catch((err: unknown) => {
          if ((err as any)?.response?.status === 404) return null // no 5xx yet
          throw err
        }),
    refetchInterval: 30_000,
    ...metricQueryDefaults,
  })

  // Threads — auth-protected
  const { data: threads } = useQuery({
    queryKey: ['super', 'metrics', 'jvm.threads.live'],
    queryFn: () => actuatorService.getMetric('jvm.threads.live').then((r) => r.data),
    refetchInterval: 30_000,
    ...metricQueryDefaults,
  })

  const overallStatus = health?.status ?? 'UNKNOWN'
  const isUp = overallStatus === 'UP'
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—'

  const heapUsedBytes = getMeasurement(heapUsed?.measurements ?? [], 'VALUE')
  const heapMaxBytes = getMeasurement(heapMax?.measurements ?? [], 'VALUE')
  const uptimeSeconds = getMeasurement(uptimeMetric?.measurements ?? [], 'VALUE')
  const totalRequests = getMeasurement(httpRequests?.measurements ?? [], 'COUNT')
  const errorCount = getMeasurement(httpErrors?.measurements ?? [], 'COUNT')
  const threadCount = getMeasurement(threads?.measurements ?? [], 'VALUE')

  const dbStatus = health?.components?.db as HealthComponentStatus | undefined
  const diskStatus = health?.components?.diskSpace as HealthComponentStatus | undefined

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Health</h1>
            <p className="text-sm text-muted-foreground">
              Live metrics — updates every 30 seconds · Last: {lastUpdated}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => refetchHealth()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Overall status banner — error or data */}
      {healthError ? (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">Cannot reach actuator endpoint</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {(healthFetchError as any)?.response?.status === 404
                ? 'GET /actuator/health returned 404. Ensure Spring Actuator is enabled and CORS allows the frontend origin.'
                : (healthFetchError as any)?.code === 'ERR_NETWORK' || (healthFetchError as any)?.code === 'ERR_CORS'
                ? 'Network/CORS error — the actuator may be running on a different port or the browser blocked the request.'
                : `Error: ${(healthFetchError as any)?.message ?? 'Unknown error'}`}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Actuator base URL: <code className="rounded bg-muted px-1 py-0.5">{import.meta.env.VITE_API_BASE_URL?.split('/api')[0] ?? 'http://localhost:8080'}</code>
            </p>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            'flex items-center justify-between rounded-xl border p-4',
            isUp
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          )}
        >
          <div className="flex items-center gap-3">
            {isUp ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600" />
            )}
            <div>
              <p className={cn('font-semibold', isUp ? 'text-green-800' : 'text-red-800')}>
                {isUp ? 'All systems operational' : 'System degraded — action required'}
              </p>
              <p className={cn('text-sm', isUp ? 'text-green-600' : 'text-red-600')}>
                {isUp
                  ? `Server has been running for ${formatUptime(uptimeSeconds)}`
                  : 'One or more components are failing. Check details below.'}
              </p>
            </div>
          </div>
          <StatusBadge status={overallStatus} />
        </div>
      )}

      {/* Metric cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Database */}
        <MetricCard title="Database" icon={Database} loading={healthLoading}>
          <div className="space-y-2">
            <StatusBadge status={dbStatus?.status ?? 'UNKNOWN'} />
            {dbStatus?.details?.database != null && (
              <p className="text-xs text-muted-foreground">
                {String(dbStatus.details.database)}
              </p>
            )}
          </div>
        </MetricCard>

        {/* Disk Space */}
        <MetricCard title="Disk Space" icon={HardDrive} loading={healthLoading}>
          <div className="space-y-2">
            <StatusBadge status={diskStatus?.status ?? 'UNKNOWN'} />
            {diskStatus?.details?.free != null && diskStatus?.details?.total != null && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Free: {formatBytes(Number(diskStatus.details.free))}</span>
                  <span>Total: {formatBytes(Number(diskStatus.details.total))}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                    style={{
                      width: `${100 - Math.round((Number(diskStatus.details.free) / Number(diskStatus.details.total)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </MetricCard>

        {/* Uptime */}
        <MetricCard title="Server Uptime" icon={Clock}>
          <p className="text-2xl font-bold text-foreground">
            {uptimeSeconds ? formatUptime(uptimeSeconds) : '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Since last restart</p>
        </MetricCard>

        {/* Threads */}
        <MetricCard title="Active Threads" icon={Cpu}>
          <p className="text-2xl font-bold text-foreground">
            {threadCount ? Math.round(threadCount) : '—'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">JVM live threads</p>
        </MetricCard>
      </div>

      {/* JVM Heap & HTTP Errors */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* JVM Heap */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Cpu className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">JVM Heap Memory</h3>
          </div>
          {heapUsedBytes && heapMaxBytes ? (
            <ProgressBar value={heapUsedBytes} max={heapMaxBytes} />
          ) : (
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          )}
        </div>

        {/* HTTP Errors */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
              <Activity className="h-4 w-4 text-destructive" />
            </div>
            <h3 className="font-semibold text-foreground">HTTP 5xx Errors</h3>
          </div>
          <p
            className={cn(
              'text-4xl font-bold',
              errorCount > 0 ? 'text-destructive' : 'text-green-600'
            )}
          >
            {Math.round(errorCount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totalRequests > 0
              ? `${Math.round(errorCount)} errors / ${Math.round(totalRequests)} total requests`
              : 'No requests recorded yet'}
          </p>
        </div>
      </div>

      {/* Component status table */}
      {health?.components && Object.keys(health.components).length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-3">
            <h3 className="font-semibold text-foreground">Component Status</h3>
          </div>
          <div className="divide-y divide-border">
            {Object.entries(health.components).map(([name, component]) => {
              const comp = component as HealthComponentStatus
              return (
                <div key={name} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm font-medium capitalize text-foreground">
                    {name.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <StatusBadge status={comp.status} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
