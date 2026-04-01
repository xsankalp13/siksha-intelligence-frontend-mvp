import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rbacService } from '@/features/super-admin/services/superAdminService'
import { Shield, Plus, Search, X, Check, Loader2, ChevronDown, Lock, Users, Zap, Info, ShieldCheck, ShieldOff } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { RoleDTO, PermissionDTO } from '@/features/super-admin/types'

// ── Constants ─────────────────────────────────────────────────────────

const DOMAINS = ['academic', 'staff', 'student', 'finance', 'timetable', 'attendance', 'examination', 'rbac']
const ACTIONS = ['read', 'write', 'delete', 'approve', 'publish', 'activate']
const SCOPES  = ['all', 'own', 'class']

const DOMAIN_COLORS: Record<string, string> = {
  academic:    'bg-blue-100 text-blue-700 border-blue-200',
  staff:       'bg-violet-100 text-violet-700 border-violet-200',
  student:     'bg-green-100 text-green-700 border-green-200',
  finance:     'bg-amber-100 text-amber-700 border-amber-200',
  timetable:   'bg-cyan-100 text-cyan-700 border-cyan-200',
  attendance:  'bg-orange-100 text-orange-700 border-orange-200',
  examination: 'bg-pink-100 text-pink-700 border-pink-200',
  rbac:        'bg-red-100 text-red-700 border-red-200',
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  STUDENT:     'Basic read access to their own data',
  TEACHER:     'Class management and attendance',
  PRINCIPAL:   'School-wide administrative access',
  LIBRARIAN:   'Library resource management',
  GUARDIAN:    'View linked student information',
  ADMIN:       'Full system administration',
  SUPER_ADMIN: 'Unrestricted platform access',
  SCHOOL_ADMIN:'Multi-school management',
}

function getDomainColor(name: string) {
  const domain = name.split(':')[0]
  return DOMAIN_COLORS[domain] ?? 'bg-muted text-muted-foreground border-border'
}

function getDomainBarColor(name: string) {
  const map: Record<string, string> = {
    academic: 'bg-blue-500', staff: 'bg-violet-500', student: 'bg-green-500',
    finance: 'bg-amber-500', timetable: 'bg-cyan-500', attendance: 'bg-orange-500',
    examination: 'bg-pink-500', rbac: 'bg-red-500',
  }
  return map[name] ?? 'bg-primary'
}

// ── Permission Description Engine ────────────────────────────────────
// Parses domain:action:scope into plain English with examples.

const DOMAIN_LABELS: Record<string, string> = {
  academic: 'academic records', staff: 'staff profiles', student: 'student data',
  finance: 'financial records', timetable: 'timetable data', attendance: 'attendance records',
  examination: 'examination data', rbac: 'roles & permissions', adm: 'admin settings',
  profile: 'user profiles', library: 'library resources', dashboard: 'dashboard',
}

const ACTION_LABELS: Record<string, string> = {
  read: 'view', write: 'create or edit', delete: 'delete',
  approve: 'approve', publish: 'publish', activate: 'activate or deactivate',
  manage: 'fully manage', mark: 'mark', config: 'configure', update: 'update', create: 'create',
  initMyProfileImageUpload: 'initiate a profile image upload for',
  completeMyProfileImageUpload: 'complete a profile image upload for',
}

const SCOPE_LABELS: Record<string, string> = {
  all: 'across all records',
  own: 'limited to their own records',
  class: 'within their assigned class',
  section: 'within their assigned section',
  linked: 'for linked/associated records',
}

/**
 * Converts a permission name (e.g. "attendance:mark:section") into a
 * one-line plain-English description.
 */
function describePermission(name: string): { summary: string; detail: string } {
  const parts = name.split(':')
  const domain = parts[0] ?? ''
  const action = parts[1] ?? ''
  const scope  = parts[2] ?? ''

  const domainLabel  = DOMAIN_LABELS[domain]  ?? domain
  const actionLabel  = ACTION_LABELS[action]  ?? action
  const scopeLabel   = SCOPE_LABELS[scope]    ?? (scope ? `(scope: ${scope})` : '')

  // Build the summary sentence
  const summary = scope
    ? `Can ${actionLabel} ${domainLabel} ${scopeLabel}.`
    : `Can ${actionLabel} ${domainLabel}.`

  // Detail hint: what happens when this is granted vs withheld
  const detail = `Granting this allows the role to ${actionLabel} ${domainLabel}${
    scope ? ` ${scopeLabel}` : ''
  }. Revoking removes that ability.`

  return { summary, detail }
}

// ── Create Permission Dialog ──────────────────────────────────────────

function CreatePermissionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [domain, setDomain] = useState('')
  const [action, setAction] = useState('')
  const [scope, setScope]   = useState('')

  const preview = domain && action && scope ? `${domain}:${action}:${scope}` : ''

  const { mutate, isPending } = useMutation({
    mutationFn: () => rbacService.createPermission(preview).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['super', 'permissions'] })
      toast.success(`Permission "${data.name}" created`)
      setDomain(''); setAction(''); setScope('')
      onClose()
    },
    onError: () => toast.error('Failed to create permission — it may already exist'),
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create Permission
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Permissions follow the <code className="rounded bg-muted px-1 text-xs">domain:action:scope</code> naming convention enforced by the backend.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Domain', value: domain, set: setDomain, items: DOMAINS },
              { label: 'Action', value: action, set: setAction, items: ACTIONS },
              { label: 'Scope',  value: scope,  set: setScope,  items: SCOPES  },
            ].map(({ label, value, set, items }) => (
              <div key={label} className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{label}</label>
                <Select value={value} onValueChange={set}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={label} /></SelectTrigger>
                  <SelectContent>
                    {items.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          {preview && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Preview</p>
              <code className="text-sm font-semibold text-primary">{preview}</code>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!preview || isPending} onClick={() => mutate()} className="gap-2">
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Permission Toggle ─────────────────────────────────────────────────

function PermissionToggle({ permission, roleId, granted }: {
  permission: PermissionDTO; roleId: number; granted: boolean
}) {
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { summary, detail } = describePermission(permission.name)
  const actionVerb = granted ? 'Revoke' : 'Grant'
  const actionColor = granted ? 'text-destructive' : 'text-green-700'

  const { mutate: assign, isPending: assigning } = useMutation({
    mutationFn: () => rbacService.assignPermission(roleId, permission.id).then((r) => r.data),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['super', 'role-permissions', roleId] })
      const prev = queryClient.getQueryData<PermissionDTO[]>(['super', 'role-permissions', roleId])
      queryClient.setQueryData<PermissionDTO[]>(['super', 'role-permissions', roleId], (old) =>
        old ? [...old, permission] : [permission]
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(['super', 'role-permissions', roleId], ctx?.prev)
      toast.error(`Failed to grant "${permission.name}"`)
    },
    onSuccess: () => toast.success(`Granted: ${permission.name}`),
  })

  const { mutate: revoke, isPending: revoking } = useMutation({
    mutationFn: () => rbacService.revokePermission(roleId, permission.id).then((r) => r.data),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['super', 'role-permissions', roleId] })
      const prev = queryClient.getQueryData<PermissionDTO[]>(['super', 'role-permissions', roleId])
      queryClient.setQueryData<PermissionDTO[]>(['super', 'role-permissions', roleId], (old) =>
        old ? old.filter((p) => p.id !== permission.id) : []
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(['super', 'role-permissions', roleId], ctx?.prev)
      toast.error(`Failed to revoke "${permission.name}"`)
    },
    onSuccess: () => toast.success(`Revoked: ${permission.name}`),
  })

  const isPending = assigning || revoking

  const handleConfirm = () => {
    setConfirmOpen(false)
    granted ? revoke() : assign()
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => !isPending && setConfirmOpen(true)}
            disabled={isPending}
            className={cn(
              'flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-all duration-150',
              granted
                ? 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
              isPending && 'opacity-60 cursor-wait'
            )}
          >
            <span className="font-mono text-xs">{permission.name}</span>
            <span className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
              granted ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
            )}>
              {isPending
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : granted ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />
              }
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs space-y-2 p-3 bg-card border border-border shadow-md text-foreground"
        >
          <p className="text-xs font-semibold text-foreground">{permission.name}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>
          <div className={cn(
            'flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium',
            granted
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-border bg-muted/60 text-muted-foreground'
          )}>
            {granted
              ? <><ShieldCheck className="h-3 w-3" /> Currently granted — click to revoke</>
              : <><ShieldOff className="h-3 w-3" /> Not granted — click to grant</>
            }
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className={cn('flex items-center gap-2', actionColor)}>
              {granted
                ? <ShieldOff className="h-5 w-5" />
                : <ShieldCheck className="h-5 w-5" />
              }
              {actionVerb} Permission
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{detail}</p>
                <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground mb-1">Permission</p>
                  <code className="text-sm font-semibold text-foreground">{permission.name}</code>
                </div>
                {granted && (
                  <p className="text-xs text-amber-600 font-medium">
                    ⚠ Users with this role will lose this capability on their next API call.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={cn(
                granted
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'bg-green-600 text-white hover:bg-green-700'
              )}
            >
              {granted
                ? <><ShieldOff className="h-3.5 w-3.5 mr-1.5" /> Yes, Revoke</>
                : <><ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Yes, Grant</>
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ── Empty State ───────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-8 py-16 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
        <Shield className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="mb-2 text-base font-semibold text-foreground">Select a role to manage permissions</h3>
      <p className="mb-8 max-w-xs text-sm text-muted-foreground">
        Choose a role from the left panel to view and toggle its permissions across all domains.
      </p>

      <div className="w-full max-w-sm space-y-3 text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">How it works</p>
        {[
          { icon: Users, title: 'Pick a role', desc: 'Select any role from the left sidebar' },
          { icon: Lock,  title: 'Toggle permissions', desc: 'Click a permission chip to grant or revoke it instantly' },
          { icon: Zap,   title: 'Instant effect', desc: 'Changes take effect on the user\'s next API call — no restart needed' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────────

export default function RbacSection() {
  const [selectedRole, setSelectedRole] = useState<RoleDTO | null>(null)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set(DOMAINS))

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['super', 'roles'],
    queryFn: () => rbacService.listRoles().then((r) => r.data),
  })

  const { data: allPermissions = [], isLoading: permsLoading } = useQuery({
    queryKey: ['super', 'permissions', search],
    queryFn: () => rbacService.listPermissions(search || undefined).then((r) => r.data),
  })

  const { data: rolePermissions = [] } = useQuery({
    queryKey: ['super', 'role-permissions', selectedRole?.id],
    queryFn: () => rbacService.listRolePermissions(selectedRole!.id).then((r) => r.data),
    enabled: !!selectedRole,
  })

  const grantedIds = useMemo(() => new Set(rolePermissions.map((p) => p.id)), [rolePermissions])

  const grouped = useMemo(() => {
    const map: Record<string, PermissionDTO[]> = {}
    for (const p of allPermissions) {
      const domain = p.name.split(':')[0] ?? 'other'
      if (!map[domain]) map[domain] = []
      map[domain].push(p)
    }
    return map
  }, [allPermissions])

  const totalGranted = rolePermissions.length
  const totalAll    = allPermissions.length
  const grantedPct  = totalAll > 0 ? Math.round((totalGranted / totalAll) * 100) : 0

  const toggleDomain = (domain: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev)
      next.has(domain) ? next.delete(domain) : next.add(domain)
      return next
    })
  }

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Roles & RBAC</h1>
            <p className="text-sm text-muted-foreground">
              Assign permissions to roles · Changes take effect on next API call
            </p>
          </div>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Permission
        </Button>
      </div>

      {/* Body — two-column layout that fills remaining height */}
      <div className="grid flex-1 gap-5 lg:grid-cols-[260px_1fr]" style={{ minHeight: 0 }}>

        {/* ── Left: Role Sidebar ─────────────────────────────── */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {/* Sidebar header */}
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              System Roles
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{roles.length} roles configured</p>
          </div>

          {/* Role list */}
          <div className="flex-1 overflow-y-auto p-2">
            {rolesLoading ? (
              <div className="space-y-1.5 p-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : (
              <div className="space-y-0.5">
                {roles.map((role) => {
                  const isSelected = selectedRole?.id === role.id
                  const label = role.name.replace(/_/g, ' ')
                  const desc = ROLE_DESCRIPTIONS[role.name] ?? 'Custom role'
                  return (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role)}
                      className={cn(
                        'group w-full rounded-lg px-3 py-2.5 text-left transition-all duration-150',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-foreground hover:bg-muted'
                      )}
                    >
                      <p className="text-sm font-medium leading-tight">{label}</p>
                      <p className={cn(
                        'mt-0.5 text-xs leading-tight truncate',
                        isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      )}>
                        {desc}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sidebar footer tip */}
          <div className="border-t border-border bg-muted/30 px-4 py-3">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              <p className="text-xs text-muted-foreground">
                Permissions cascade — higher roles inherit access automatically.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right: Permission Panel ────────────────────────── */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">

          {/* Panel header — sticky search + stats */}
          <div className="border-b border-border bg-card px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search permissions…"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {selectedRole && (
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className="gap-1.5 border-green-200 bg-green-50 text-green-700"
                  >
                    <Check className="h-3 w-3" />
                    {totalGranted} / {totalAll} granted
                  </Badge>
                </div>
              )}
            </div>

            {/* Progress bar — only when role selected */}
            {selectedRole && totalAll > 0 && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{selectedRole.name.replace(/_/g, ' ')}</span>
                  <span>{grantedPct}% coverage</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-green-500 transition-all duration-500"
                    style={{ width: `${grantedPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Panel body — scrollable */}
          <div className="flex-1 overflow-y-auto p-5">
            {!selectedRole ? (
              <EmptyState />
            ) : permsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : Object.entries(grouped).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="mb-3 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">No permissions match your search</p>
                <p className="mt-1 text-xs text-muted-foreground">Try a different keyword or clear the filter</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(grouped).map(([domain, perms]) => {
                  const expanded = expandedDomains.has(domain)
                  const grantedInDomain = perms.filter((p) => grantedIds.has(p.id)).length
                  const domainPct = perms.length > 0 ? Math.round((grantedInDomain / perms.length) * 100) : 0
                  return (
                    <div key={domain} className="overflow-hidden rounded-xl border border-border bg-background">
                      {/* Domain header */}
                      <button
                        onClick={() => toggleDomain(domain)}
                        className="flex w-full items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <Badge
                          variant="outline"
                          className={cn('shrink-0 text-xs font-semibold capitalize', getDomainColor(domain))}
                        >
                          {domain}
                        </Badge>

                        {/* Mini progress bar */}
                        <div className="flex flex-1 items-center gap-2 min-w-0">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn('h-1 rounded-full transition-all duration-300', getDomainBarColor(domain))}
                              style={{ width: `${domainPct}%` }}
                            />
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {grantedInDomain}/{perms.length}
                          </span>
                        </div>

                        <ChevronDown className={cn(
                          'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                          expanded ? 'rotate-180' : ''
                        )} />
                      </button>

                      {/* Permissions grid */}
                      {expanded && (
                        <TooltipProvider delayDuration={400}>
                          <div className="grid grid-cols-1 gap-1.5 border-t border-border px-4 pb-4 pt-3 sm:grid-cols-2 lg:grid-cols-3">
                            {perms.map((perm) => (
                              <PermissionToggle
                                key={perm.id}
                                permission={perm}
                                roleId={selectedRole.id}
                                granted={grantedIds.has(perm.id)}
                              />
                            ))}
                          </div>
                        </TooltipProvider>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <CreatePermissionDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
