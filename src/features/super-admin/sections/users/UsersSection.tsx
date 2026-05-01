import { useMemo, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { adminService } from '@/services/admin'
import type { StaffSummaryDTO } from '@/services/admin'
import { sessionService, guardianService } from '@/features/super-admin/services/superAdminService'
import { api } from '@/lib/axios'
import {
  Users, Search, UserX, Loader2, Plus, GraduationCap, Briefcase,
  Heart, Phone, ChevronDown, ChevronRight, Printer, CreditCard, UploadCloud, ShieldCheck, ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import type { GuardianSummaryDto } from '@/features/super-admin/types'
import { idCardService, triggerBlobDownload } from '@/services/idCard'
import { IdCardBatchDialog } from '@/features/uis/id-card/IdCardBatchDialog'
import { BulkPhotoUploadDialog } from '@/features/uis/id-card/BulkPhotoUploadDialog'

// ── Create School Admin Dialog ────────────────────────────────────────

type SchoolAdminMode = 'map' | 'create'

function CreateSchoolAdminDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}) {
  const [mode, setMode] = useState<SchoolAdminMode>('map')
  const [selectedStaffUuid, setSelectedStaffUuid] = useState('')

  // Mode: Create New
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    designation: '',
    department: '',
  })

  const reset = () => {
    setMode('map')
    setSelectedStaffUuid('')
    setForm({ firstName: '', lastName: '', email: '', username: '', password: '', designation: '', department: '' })
  }

  const handleClose = () => { reset(); onClose() }

  // Mode A: Map existing staff → promote
  const { mutate: promoteExisting, isPending: isPromoting } = useMutation({
    mutationFn: () =>
      api.post(`/auth/admin/users/school-admin/promote`, { staffUuid: selectedStaffUuid }),
    onSuccess: () => {
      toast.success('✅ Staff promoted to School Admin')
      handleClose()
      onSuccess?.()
    },
    onError: () => toast.error('Failed to promote — staff may already be a School Admin'),
  })

  // Mode B: Create new staff + grant School Admin role
  const { mutate: createNew, isPending: isCreating } = useMutation({
    mutationFn: () =>
      api.post('/auth/admin/users/school-admin', {
        username: form.username,
        email: form.email,
        initialPassword: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        designation: form.designation || undefined,
        department: form.department || undefined,
      }),
    onSuccess: () => {
      toast.success('🎉 School Admin account created with staff record')
      handleClose()
      onSuccess?.()
    },
    onError: () => toast.error('Failed to create account — username or email may already be taken'),
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  const isMapValid = selectedStaffUuid.trim().length > 0
  const isCreateValid = form.firstName && form.lastName && form.email && form.username && form.password

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-violet-600" />
            Add School Admin
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            A School Admin <strong>must be a staff member</strong>. Choose how to add them:
          </p>
        </DialogHeader>

        {/* Mode Switcher */}
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-1 bg-muted/40">
          <button
            onClick={() => setMode('map')}
            className={cn(
              'relative rounded-md px-3 py-2 text-xs font-medium transition-all',
              mode === 'map'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            🔗 Map Existing Staff
          </button>
          <button
            onClick={() => setMode('create')}
            className={cn(
              'relative rounded-md px-3 py-2 text-xs font-medium transition-all',
              mode === 'create'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            ➕ Create New Staff
          </button>
        </div>

        {/* MODE A: Map existing staff */}
        {mode === 'map' && (
          <div className="space-y-3">
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-3 text-xs text-blue-800 dark:text-blue-300">
              <strong>How it works:</strong> Select an existing staff member to grant them School Admin privileges.
              Their current role (Teacher, Principal, etc.) is preserved.
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Search Staff Member</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 text-sm"
                  placeholder="Type name or employee ID…"
                  onChange={(e) => {
                    // Simple text-to-uuid stub: real impl uses a staff search dropdown
                    setSelectedStaffUuid(e.target.value)
                  }}
                  value={selectedStaffUuid}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Paste the Staff UUID or use the search to find a staff member
              </p>
            </div>
          </div>
        )}

        {/* MODE B: Create new staff + admin */}
        {mode === 'create' && (
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-3 text-xs text-emerald-800 dark:text-emerald-300">
              <strong>How it works:</strong> This creates a new staff record and grants School Admin role simultaneously.
              The person will appear in both Staff and School Admins tabs.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">First Name *</label>
                <Input placeholder="First name" value={form.firstName} onChange={set('firstName')} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Last Name *</label>
                <Input placeholder="Last name" value={form.lastName} onChange={set('lastName')} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Email *</label>
              <Input type="email" placeholder="admin@school.edu" value={form.email} onChange={set('email')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Username *</label>
                <Input placeholder="username" value={form.username} onChange={set('username')} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Temp Password *</label>
                <Input type="password" placeholder="••••••••" value={form.password} onChange={set('password')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Designation</label>
                <Input placeholder="e.g. Principal" value={form.designation} onChange={set('designation')} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Department</label>
                <Input placeholder="e.g. Administration" value={form.department} onChange={set('department')} />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} className="text-xs">Cancel</Button>
          {mode === 'map' ? (
            <Button
              disabled={!isMapValid || isPromoting}
              onClick={() => promoteExisting()}
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white text-xs"
            >
              {isPromoting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              🔗 Promote to School Admin
            </Button>
          ) : (
            <Button
              disabled={!isCreateValid || isCreating}
              onClick={() => createNew()}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              {isCreating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              ➕ Create Staff + Admin
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


// ── Shared skeleton row ───────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0">
      <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-3 w-56 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

// ── Staff Row ─────────────────────────────────────────────────────────

function StaffRow({ member, onHrAdminChanged }: { member: StaffSummaryDTO; onHrAdminChanged?: () => void }) {
  const { mutate: forceLogout, isPending: isLoggingOut } = useMutation({
    mutationFn: () => sessionService.forceLogoutUser(member.uuid).then((r) => r.data),
    onSuccess: (data) => toast.success(data.message),
    onError: () => toast.error('Failed to force logout'),
  })

  const isHrAdmin = (member as any).hrAdmin === true || (member as any).roles?.includes('ROLE_HR_ADMIN')

  const { mutate: promoteHrAdmin, isPending: isPromoting } = useMutation({
    mutationFn: () => adminService.promoteToHrAdmin(String(member.staffId)),
    onSuccess: () => {
      toast.success(`🎉 ${member.firstName} is now an HR Admin`)
      onHrAdminChanged?.()
    },
    onError: () => toast.error('Failed to grant HR Admin role'),
  })

  const { mutate: demoteHrAdmin, isPending: isDemoting } = useMutation({
    mutationFn: () => adminService.demoteFromHrAdmin(String(member.staffId)),
    onSuccess: () => {
      toast.success(`HR Admin role removed from ${member.firstName}`)
      onHrAdminChanged?.()
    },
    onError: () => toast.error('Failed to revoke HR Admin role'),
  })

  const isHrPending = isPromoting || isDemoting

  return (
    <div className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0 hover:bg-muted/30 transition-colors">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {member.firstName[0]}{member.lastName[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {member.firstName} {member.lastName}
        </p>
        <p className="text-xs text-muted-foreground truncate">{member.username} · {member.email}</p>
      </div>
      <Badge variant="outline" className="shrink-0 text-xs capitalize">
        {member.staffType.replace(/_/g, ' ').toLowerCase()}
      </Badge>
      {isHrAdmin && (
        <Badge className="shrink-0 text-xs bg-violet-100 text-violet-700 border-violet-200">
          👑 HR Admin
        </Badge>
      )}
      <Badge
        variant="outline"
        className={cn('shrink-0 text-xs', member.active
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-red-200 bg-red-50 text-red-700')}
      >
        {member.active ? 'Active' : 'Inactive'}
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'shrink-0 gap-1.5 text-xs',
          isHrAdmin
            ? 'text-violet-600 hover:text-red-600 hover:bg-red-50'
            : 'text-muted-foreground hover:text-violet-600 hover:bg-violet-50'
        )}
        disabled={isHrPending}
        onClick={() => isHrAdmin ? demoteHrAdmin() : promoteHrAdmin()}
        title={isHrAdmin ? 'Revoke HR Admin role' : 'Grant HR Admin role'}
      >
        {isHrPending
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <ShieldCheck className="h-3.5 w-3.5" />}
        {isHrAdmin ? 'Revoke HR' : '👑 HR Admin'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 gap-1.5 text-muted-foreground hover:text-primary text-xs"
        onClick={async () => {
          try {
            const res = await idCardService.downloadStaffIdCard(member.staffId);
            triggerBlobDownload(res.data, `staff-id-${member.staffId}.pdf`);
          } catch (e) {
            toast.error('Failed to download ID Card');
          }
        }}
      >
        <CreditCard className="h-3.5 w-3.5" />
        ID Card
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 gap-1.5 text-muted-foreground hover:text-destructive text-xs"
        disabled={isLoggingOut}
        onClick={() => forceLogout()}
      >
        {isLoggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
        Force Logout
      </Button>
    </div>
  )
}

// ── Guardian Row ──────────────────────────────────────────────────────

// Uses GuardianSummaryDto from GET /super/users/guardians
// linkedStudents are already embedded — no extra fetches needed.

function GuardianRow({ guardian }: { guardian: GuardianSummaryDto }) {
  const [expanded, setExpanded] = useState(false)
  const hasStudents = (guardian.linkedStudents?.length ?? 0) > 0
  const initials = guardian.name?.slice(0, 2).toUpperCase() ?? '??'

  return (
    <div className={cn('border-b border-border last:border-0', expanded && 'bg-muted/20')}>
      {/* Main guardian row */}
      <div className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
        {/* Expand toggle — only if has students */}
        <button
          className="shrink-0 text-muted-foreground disabled:opacity-30"
          disabled={!hasStudents}
          onClick={() => setExpanded((v) => !v)}
        >
          {hasStudents
            ? expanded
              ? <ChevronDown className="h-4 w-4" />
              : <ChevronRight className="h-4 w-4" />
            : <span className="inline-block h-4 w-4" />
          }
        </button>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-semibold text-rose-700">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{guardian.name}</p>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-2">
            {guardian.username && <span>{guardian.username}</span>}
            {guardian.email && <span>· {guardian.email}</span>}
            {guardian.phoneNumber && (
              <span className="flex items-center gap-0.5">
                · <Phone className="h-3 w-3" /> {guardian.phoneNumber}
              </span>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 flex-wrap justify-end">
          {guardian.relation && (
            <Badge variant="outline" className="text-xs capitalize">
              {guardian.relation.replace(/_/g, ' ').toLowerCase()}
            </Badge>
          )}
          {guardian.primaryContact && (
            <Badge variant="outline" className="text-xs border-blue-200 bg-blue-50 text-blue-700">
              Primary
            </Badge>
          )}
          {guardian.linkedStudentCount !== undefined && (
            <Badge variant="outline" className="text-xs">
              {guardian.linkedStudentCount} student{guardian.linkedStudentCount !== 1 ? 's' : ''}
            </Badge>
          )}
          {guardian.active !== undefined && (
            <Badge
              variant="outline"
              className={cn('text-xs', guardian.active
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-700')}
            >
              {guardian.active ? 'Active' : 'Inactive'}
            </Badge>
          )}
        </div>
      </div>

      {/* Linked students expandable */}
      {expanded && hasStudents && (
        <div className="border-t border-border/50 bg-muted/30 px-5 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Linked Students
          </p>
          <div className="space-y-1.5">
            {guardian.linkedStudents!.map((s) => (
              <div key={s.studentUuid} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700">
                  {s.name?.[0] ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {s.enrollmentNumber}
                    {s.className && ` · ${s.className}${s.sectionName ? ` - ${s.sectionName}` : ''}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Section ──────────────────────────────────────────────────────

export default function UsersSection() {
  const [createOpen, setCreateOpen] = useState(false)
  const [staffSearch, setStaffSearch] = useState('')
  const [schoolAdminSearch, setSchoolAdminSearch] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [guardianSearch, setGuardianSearch] = useState('')
  const [guardianPage, setGuardianPage] = useState(0)
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [bulkPhotoOpen, setBulkPhotoOpen] = useState(false)
  const [bulkPhotoType, setBulkPhotoType] = useState<'students' | 'staff'>('students')
  const [promoteTarget, setPromoteTarget] = useState<StaffSummaryDTO | null>(null)
  const [promoteStep, setPromoteStep] = useState<1 | 2>(1)
  const [promoteConfirmText, setPromoteConfirmText] = useState('')

  const { data: staffPage, isLoading: staffLoading, refetch: refetchStaff } = useQuery({
    queryKey: ['admin', 'staff', staffSearch],
    queryFn: () => adminService.listStaff({ search: staffSearch || undefined, size: 30 }).then((r) => r.data),
  })

  const { data: studentPage, isLoading: studentLoading } = useQuery({
    queryKey: ['admin', 'students', studentSearch],
    queryFn: () => adminService.listStudents({ search: studentSearch || undefined, size: 30 }).then((r) => r.data),
  })

  const {
    data: schoolAdminsPage,
    isLoading: schoolAdminsLoading,
    refetch: refetchSchoolAdmins,
  } = useQuery({
    queryKey: ['admin', 'school-admins', schoolAdminSearch],
    queryFn: () =>
      adminService
        .listStaff({ search: schoolAdminSearch || undefined, staffType: 'SCHOOL_ADMIN', size: 30 })
        .then((r) => r.data),
  })

  const { data: promotionCandidatesPage, refetch: refetchPromotionCandidates } = useQuery({
    queryKey: ['admin', 'school-admin-candidates', schoolAdminSearch],
    queryFn: () =>
      adminService
        .listStaff({ search: schoolAdminSearch || undefined, size: 200 })
        .then((r) => r.data),
  })

  // Flat guardian list — single request, no N+1
  const { data: guardiansPage, isLoading: guardianLoading } = useQuery({
    queryKey: ['super', 'guardians', guardianSearch, guardianPage],
    queryFn: () =>
      guardianService.listGuardians({
        search: guardianSearch || undefined,
        page: guardianPage,
        size: 25,
      }).then((r) => r.data),
    placeholderData: (prev) => prev,
  })

  const staff     = staffPage?.content     ?? []
  const schoolAdmins = schoolAdminsPage?.content ?? []
  const students  = studentPage?.content   ?? []
  const guardians = guardiansPage?.content ?? []
  const guardianTotalPages = guardiansPage?.totalPages ?? 1
  const promotionCandidates = useMemo(
    () =>
      (promotionCandidatesPage?.content ?? []).filter(
        (member) => member.active && String(member.staffType).toUpperCase() !== 'SCHOOL_ADMIN'
      ),
    [promotionCandidatesPage?.content],
  )

  const { mutate: promoteToSchoolAdmin, isPending: promoting } = useMutation({
    mutationFn: async (staffUuid: string) => {
      const attempts: Array<() => Promise<unknown>> = [
        () => api.post(`/auth/admin/users/staff/${staffUuid}/promote-school-admin`),
        () => api.post(`/auth/admin/users/school-admin/promote/${staffUuid}`),
        () => api.post('/auth/admin/users/school-admin/promote', { staffUuid }),
      ]

      let lastError: unknown = null
      for (const attempt of attempts) {
        try {
          return await attempt()
        } catch (error) {
          lastError = error
        }
      }
      throw lastError
    },
    onSuccess: () => {
      toast.success('Staff promoted to School Admin')
      setPromoteTarget(null)
      setPromoteStep(1)
      setPromoteConfirmText('')
      refetchSchoolAdmins()
      refetchPromotionCandidates()
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } | string }; message?: string })
      const serverMessage =
        typeof msg?.response?.data === 'string'
          ? msg.response.data
          : msg?.response?.data?.message
      toast.error(serverMessage ?? msg?.message ?? 'Promotion endpoint unavailable or failed')
    },
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Users</h1>
            <p className="text-sm text-muted-foreground">
              Manage staff, students, guardians, and create school admin accounts
            </p>
          </div>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create School Admin
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Staff',     value: staffPage?.totalElements     ?? '—', icon: Briefcase },
          { label: 'Total Students',  value: studentPage?.totalElements   ?? '—', icon: GraduationCap },
          { label: 'Total Guardians', value: guardiansPage?.totalElements ?? '—', icon: Heart },
          { label: 'Active Staff',    value: staff.filter((s) => s.active).length, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="staff">
        <TabsList>
          <TabsTrigger value="staff" className="gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />
            Staff ({staffPage?.totalElements ?? 0})
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            Students ({studentPage?.totalElements ?? 0})
          </TabsTrigger>
          <TabsTrigger value="guardians" className="gap-1.5">
            <Heart className="h-3.5 w-3.5" />
            Guardians ({guardiansPage?.totalElements ?? 0})
          </TabsTrigger>
          <TabsTrigger value="school-admins" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            School Admins ({schoolAdminsPage?.totalElements ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* ── Staff ── */}
        <TabsContent value="staff" className="mt-4">
          <div className="space-y-3">
            <div className="relative flex gap-2 w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search staff…"
                className="pl-9"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
              />
              <Button onClick={() => { setBulkPhotoType('staff'); setBulkPhotoOpen(true); }} variant="outline" className="shrink-0 gap-2">
                <UploadCloud className="h-4 w-4" /> Upload Photos
              </Button>
            </div>
            <div className="rounded-xl border border-border bg-card shadow-sm">
              {staffLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : staff.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  <p className="text-sm">No staff found</p>
                </div>
              ) : (
                staff.map((m) => <StaffRow key={m.staffId} member={m} onHrAdminChanged={refetchStaff} />)
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Students ── */}
        <TabsContent value="students" className="mt-4">
          <div className="space-y-3">
            <div className="flex gap-2 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students…"
                className="pl-9"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
              <Button onClick={() => setBatchDialogOpen(true)} variant="outline" className="shrink-0 gap-2">
                <Printer className="h-4 w-4" /> Batch Print IDs
              </Button>
              <Button onClick={() => { setBulkPhotoType('students'); setBulkPhotoOpen(true); }} variant="outline" className="shrink-0 gap-2">
                <UploadCloud className="h-4 w-4" /> Upload Photos
              </Button>
            </div>
            <div className="rounded-xl border border-border bg-card shadow-sm">
              {studentLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : students.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <GraduationCap className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  <p className="text-sm">No students found</p>
                </div>
              ) : (
                students.map((s) => (
                  <div key={s.studentId} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0 hover:bg-muted/30 transition-colors">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700">
                      {s.firstName[0]}{s.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {s.firstName} {s.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.username} · {s.enrollmentNumber}
                        {s.className && ` · ${s.className}${s.sectionName ? ` - ${s.sectionName}` : ''}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-end gap-2">
                       <Badge
                        variant="outline"
                        className={cn('text-xs shrink-0', s.enrollmentStatus === 'ACTIVE'
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : '')}
                      >
                        {s.enrollmentStatus}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-muted-foreground hover:text-primary text-xs"
                        onClick={async () => {
                          try {
                            const res = await idCardService.downloadStudentIdCard(s.studentId);
                            triggerBlobDownload(res.data, `student-id-${s.studentId}.pdf`);
                          } catch (e) {
                            toast.error('Failed to download ID Card');
                          }
                        }}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        ID Card
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Guardians ── */}
        {/* Single paginated request via GET /super/users/guardians
            linkedStudents are already embedded per guardian — zero N+1. */}
        <TabsContent value="guardians" className="mt-4">
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone…"
                className="pl-9"
                value={guardianSearch}
                onChange={(e) => { setGuardianSearch(e.target.value); setGuardianPage(0) }}
              />
            </div>

            <div className="rounded-xl border border-border bg-card shadow-sm">
              {/* Column header */}
              <div className="hidden sm:flex items-center gap-3 border-b border-border bg-muted/50 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="w-4 shrink-0" />
                <span className="w-9 shrink-0" />
                <span className="flex-1">Guardian</span>
                <span className="w-36 shrink-0 text-right">Details</span>
              </div>

              {guardianLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : guardians.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Heart className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  <p className="text-sm">No guardians found</p>
                </div>
              ) : (
                guardians.map((g) => <GuardianRow key={g.guardianUuid} guardian={g} />)
              )}
            </div>

            {/* Pagination */}
            {guardianTotalPages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <p className="text-muted-foreground">
                  Page {guardianPage + 1} of {guardianTotalPages} · {guardiansPage?.totalElements ?? 0} total
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm"
                    disabled={guardianPage === 0}
                    onClick={() => setGuardianPage((p) => p - 1)}
                  >← Prev</Button>
                  <Button
                    variant="outline" size="sm"
                    disabled={guardianPage + 1 >= guardianTotalPages}
                    onClick={() => setGuardianPage((p) => p + 1)}
                  >Next →</Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── School Admins ── */}
        <TabsContent value="school-admins" className="mt-4">
          <div className="space-y-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search school admins..."
                className="pl-9"
                value={schoolAdminSearch}
                onChange={(e) => setSchoolAdminSearch(e.target.value)}
              />
            </div>

            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-5 py-3">
                <p className="text-sm font-semibold">Existing School Admins</p>
              </div>
              {schoolAdminsLoading ? (
                Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
              ) : schoolAdmins.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <ShieldCheck className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  <p className="text-sm">No school admins found</p>
                </div>
              ) : (
                schoolAdmins.map((member) => <StaffRow key={member.staffId} member={member} />)
              )}
            </div>

            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-5 py-3">
                <p className="text-sm font-semibold">Promote Staff to School Admin</p>
                <p className="text-xs text-muted-foreground mt-1">Requires two-step confirmation before promotion.</p>
              </div>
              {promotionCandidates.length === 0 ? (
                <div className="py-8 px-5 text-sm text-muted-foreground">No eligible active staff found.</div>
              ) : (
                promotionCandidates.slice(0, 30).map((member) => (
                  <div key={member.staffId} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0 hover:bg-muted/30 transition-colors">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {member.firstName[0]}{member.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{member.firstName} {member.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.username} · {member.email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{member.staffType}</Badge>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
                      setPromoteTarget(member)
                      setPromoteStep(1)
                      setPromoteConfirmText('')
                    }}>
                      Promote <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!promoteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setPromoteTarget(null)
            setPromoteStep(1)
            setPromoteConfirmText('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Promote To School Admin</DialogTitle>
          </DialogHeader>
          {promoteTarget && (
            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="font-medium text-foreground">{promoteTarget.firstName} {promoteTarget.lastName}</p>
                <p className="text-xs text-muted-foreground">{promoteTarget.username} · {promoteTarget.email}</p>
                <p className="text-xs text-muted-foreground">Current Type: {promoteTarget.staffType}</p>
              </div>

              {promoteStep === 1 ? (
                <p className="text-muted-foreground">
                  Step 1/2: Review candidate details and continue to final confirmation.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-muted-foreground">Step 2/2: Type <span className="font-semibold text-foreground">PROMOTE</span> to confirm.</p>
                  <Input
                    placeholder="Type PROMOTE"
                    value={promoteConfirmText}
                    onChange={(e) => setPromoteConfirmText(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              if (promoteStep === 2) {
                setPromoteStep(1)
                setPromoteConfirmText('')
              } else {
                setPromoteTarget(null)
              }
            }}>
              {promoteStep === 2 ? 'Back' : 'Cancel'}
            </Button>
            {promoteStep === 1 ? (
              <Button onClick={() => setPromoteStep(2)}>Continue</Button>
            ) : (
              <Button
                disabled={promoteConfirmText !== 'PROMOTE' || promoting || !promoteTarget}
                onClick={() => {
                  if (!promoteTarget) return
                  promoteToSchoolAdmin(promoteTarget.uuid)
                }}
              >
                {promoting ? 'Promoting...' : 'Confirm Promotion'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateSchoolAdminDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => { refetchSchoolAdmins(); refetchPromotionCandidates(); }}
      />
      <IdCardBatchDialog open={batchDialogOpen} onClose={() => setBatchDialogOpen(false)} />
      <BulkPhotoUploadDialog open={bulkPhotoOpen} onClose={() => setBulkPhotoOpen(false)} userType={bulkPhotoType} />
    </div>
  )
}
