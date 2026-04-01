import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { logsService } from '@/features/super-admin/services/superAdminService'
import { Terminal, Search, RefreshCw, Play, Square, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { LogLevel } from '@/features/super-admin/types'

// ── Constants ─────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<string, string> = {
  ERROR: 'bg-red-100 text-red-700 border-red-200',
  WARN:  'bg-amber-100 text-amber-700 border-amber-200',
  INFO:  'bg-blue-100 text-blue-700 border-blue-200',
  DEBUG: 'bg-gray-100 text-gray-600 border-gray-200',
}

const LEVEL_TEXT_COLORS: Record<string, string> = {
  ERROR: 'text-red-400',
  WARN:  'text-amber-400',
  INFO:  'text-blue-400',
  DEBUG: 'text-gray-500',
  ALL:   'text-gray-400',
}

const LINE_COUNTS = [100, 200, 500, 1000] as const

// ── Main Section ──────────────────────────────────────────────────────

export default function AppLogsSection() {
  const [level, setLevel]       = useState<LogLevel>('ALL')
  const [lines, setLines]       = useState(200)
  const [search, setSearch]     = useState('')
  const [liveTail, setLiveTail] = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['super', 'logs', level, lines],
    queryFn: () => logsService.getAppLogs(lines, level).then((r) => r.data),
    refetchInterval: liveTail ? 10_000 : false,
  })

  // Auto-scroll to bottom when live tail is on and new data arrives
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { if (liveTail) scrollToBottom() }, [data, liveTail, scrollToBottom])

  const allEntries = data?.entries ?? []
  const filtered = search
    ? allEntries.filter(
        (e) =>
          e.message.toLowerCase().includes(search.toLowerCase()) ||
          e.logger.toLowerCase().includes(search.toLowerCase())
      )
    : allEntries

  const errorCount = allEntries.filter((e) => e.level === 'ERROR').length
  const warnCount  = allEntries.filter((e) => e.level === 'WARN').length

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">App Logs</h1>
            <p className="text-sm text-muted-foreground">
              {data?.logFile ?? 'Loading log file…'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {errorCount > 0 && (
            <Badge variant="outline" className="gap-1.5 border-red-200 bg-red-50 text-red-700">
              <AlertCircle className="h-3 w-3" />
              {errorCount} errors
            </Badge>
          )}
          {warnCount > 0 && (
            <Badge variant="outline" className="gap-1.5 border-amber-200 bg-amber-50 text-amber-700">
              {warnCount} warnings
            </Badge>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Level filter */}
        <Select value={level} onValueChange={(v) => setLevel(v as LogLevel)}>
          <SelectTrigger className="h-9 w-28 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'] as LogLevel[]).map((l) => (
              <SelectItem key={l} value={l}>
                <span className={cn('font-mono font-semibold text-xs', LEVEL_TEXT_COLORS[l])}>{l}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Lines */}
        <Select value={String(lines)} onValueChange={(v) => setLines(Number(v))}>
          <SelectTrigger className="h-9 w-24 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LINE_COUNTS.map((n) => (
              <SelectItem key={n} value={String(n)}>{n} lines</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="Search messages…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Live tail toggle */}
        <Button
          variant={liveTail ? 'default' : 'outline'}
          size="sm"
          className="gap-2"
          onClick={() => setLiveTail((v) => !v)}
        >
          {liveTail ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {liveTail ? 'Stop' : 'Live Tail'}
        </Button>

        {/* Manual refresh */}
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Log terminal */}
      <div className="flex-1 overflow-hidden rounded-xl border border-border bg-zinc-950 shadow-sm">
        <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
          <span className="ml-2 text-xs text-zinc-500 font-mono">
            {filtered.length} of {allEntries.length} entries
            {liveTail && (
              <span className="ml-2 inline-flex items-center gap-1 text-green-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                LIVE
              </span>
            )}
          </span>
        </div>

        <div className="h-[calc(100%-2.5rem)] overflow-y-auto px-1 py-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-5 w-5 animate-spin text-zinc-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
              <Terminal className="mb-2 h-8 w-8" />
              <p className="text-sm">No log entries match your criteria</p>
            </div>
          ) : (
            <table className="w-full text-xs font-mono">
              <tbody>
                {filtered.map((entry, i) => (
                  <tr
                    key={i}
                    className={cn(
                      'group leading-5 hover:bg-zinc-800/50',
                      entry.level === 'ERROR' && 'bg-red-950/20'
                    )}
                  >
                    {/* Timestamp */}
                    <td className="whitespace-nowrap py-0.5 pl-3 pr-3 text-zinc-600">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </td>
                    {/* Level */}
                    <td className="w-12 whitespace-nowrap py-0.5 pr-3">
                      <span className={cn('font-semibold', LEVEL_TEXT_COLORS[entry.level])}>
                        {entry.level}
                      </span>
                    </td>
                    {/* Logger */}
                    <td className="max-w-[180px] truncate py-0.5 pr-3 text-zinc-500">
                      {entry.logger.split('.').pop()}
                    </td>
                    {/* Message */}
                    <td className={cn('py-0.5 pr-3 break-all', entry.level === 'ERROR' ? 'text-red-300' : 'text-zinc-300')}>
                      {search ? (
                        entry.message.split(new RegExp(`(${search})`, 'i')).map((part, j) =>
                          part.toLowerCase() === search.toLowerCase()
                            ? <mark key={j} className="bg-amber-400/30 text-amber-300 rounded-sm">{part}</mark>
                            : part
                        )
                      ) : entry.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
