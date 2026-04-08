import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { adminService } from '@/services/admin'
import type { StaffSummaryDTO } from '@/services/admin'
import { sessionService, guardianService } from '@/features/super-admin/services/superAdminService'
import { api } from '@/lib/axios'
import {
  Users, Search, UserX, Loader2, Plus, GraduationCap, Briefcase,
  Heart, Phone, ChevronDown, ChevronRight, Printer, CreditCard, UploadCloud
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

function CreateSchoolAdminDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', firstName: '', lastName: '' })

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post('/auth/admin/users/school-admin', {
      username: form.username,
      email: form.email,
      initialPassword: form.password,
      firstName: form.firstName,
      lastName: form.lastName,
    }),
    onSuccess: () => {
      toast.success('School Admin account created')
      setForm({ username: '', email: '', password: '', firstName: '', lastName: '' })
      onClose()
    },
    onError: () => toast.error('Failed to create account — username or email may be taken'),
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  const isValid = form.username && form.email && form.password && form.firstName && form.lastName

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create School Admin
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">First Name</label>
              <Input placeholder="First name" value={form.firstName} onChange={set('firstName')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Last Name</label>
              <Input placeholder="Last name" value={form.lastName} onChange={set('lastName')} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Username</label>
            <Input placeholder="username" value={form.username} onChange={set('username')} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <Input type="email" placeholder="admin@school.edu" value={form.email} onChange={set('email')} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Initial Password</label>
            <Input type="password" placeholder="Temporary password" value={form.password} onChange={set('password')} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!isValid || isPending} onClick={() => mutate()} className="gap-2">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create Admin
          </Button>
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

function StaffRow({ member }: { member: StaffSummaryDTO }) {
  const { mutate: forceLogout, isPending } = useMutation({
    mutationFn: () => sessionService.forceLogoutUser(member.uuid).then((r) => r.data),
    onSuccess: (data) => toast.success(data.message),
    onError: () => toast.error('Failed to force logout'),
  })

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
        disabled={isPending}
        onClick={() => forceLogout()}
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
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
  const [studentSearch, setStudentSearch] = useState('')
  const [guardianSearch, setGuardianSearch] = useState('')
  const [guardianPage, setGuardianPage] = useState(0)
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [bulkPhotoOpen, setBulkPhotoOpen] = useState(false)
  const [bulkPhotoType, setBulkPhotoType] = useState<'students' | 'staff'>('students')

  const { data: staffPage, isLoading: staffLoading } = useQuery({
    queryKey: ['admin', 'staff', staffSearch],
    queryFn: () => adminService.listStaff({ search: staffSearch || undefined, size: 30 }).then((r) => r.data),
  })

  const { data: studentPage, isLoading: studentLoading } = useQuery({
    queryKey: ['admin', 'students', studentSearch],
    queryFn: () => adminService.listStudents({ search: studentSearch || undefined, size: 30 }).then((r) => r.data),
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
  const students  = studentPage?.content   ?? []
  const guardians = guardiansPage?.content ?? []
  const guardianTotalPages = guardiansPage?.totalPages ?? 1

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
                staff.map((m) => <StaffRow key={m.staffId} member={m} />)
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
      </Tabs>

      <CreateSchoolAdminDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <IdCardBatchDialog open={batchDialogOpen} onClose={() => setBatchDialogOpen(false)} />
      <BulkPhotoUploadDialog open={bulkPhotoOpen} onClose={() => setBulkPhotoOpen(false)} userType={bulkPhotoType} />
    </div>
  )
}
