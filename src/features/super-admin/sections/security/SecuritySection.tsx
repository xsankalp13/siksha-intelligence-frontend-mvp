import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { sessionService } from '@/features/super-admin/services/superAdminService'
import { adminService } from '@/services/admin'
import { Lock, UserX, ShieldOff, KeyRound, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

// ── Reset Password Dialog ─────────────────────────────────────────────

function ResetPasswordDialog({
  userId,
  username,
  open,
  onClose,
}: {
  userId: string
  username: string
  open: boolean
  onClose: () => void
}) {
  const [password, setPassword] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => sessionService.resetUserPassword(userId, password || undefined).then((r) => r.data),
    onSuccess: (data) => {
      if (data.temporaryPassword) {
        toast.success(`Password reset. Temporary password: ${data.temporaryPassword}`, { duration: 10000 })
      } else {
        toast.success(data.message ?? 'Password reset successfully')
      }
      setPassword('')
      onClose()
    },
    onError: () => toast.error('Failed to reset password'),
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Reset Password — {username}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Enter a new password, or leave blank to use the system default password.
          </p>
          <Input
            type="password"
            placeholder="New password (optional)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutate()} disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Reset Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Section ──────────────────────────────────────────────────────

export default function SecuritySection() {
  const [resetTarget, setResetTarget] = useState<{ userUuid: string; username: string } | null>(null)

  // Force Logout All
  const { mutate: forceLogoutAll, isPending: loggingOutAll } = useMutation({
    mutationFn: () => sessionService.forceLogoutAll().then((r) => r.data),
    onSuccess: (data) => toast.success(data.message ?? 'All sessions terminated'),
    onError: () => toast.error('Failed to terminate sessions'),
  })

  // Load staff for force-logout targets
  const { data: staffPage } = useQuery({
    queryKey: ['admin', 'staff', 'security-view'],
    queryFn: () => adminService.listStaff({ size: 20 }).then((r) => r.data),
  })

  const staff = staffPage?.content ?? []

  const { mutate: forceLogoutUser, isPending: loggingOutUser, variables: loggingOutId } = useMutation({
    mutationFn: (uuid: string) => sessionService.forceLogoutUser(uuid).then((r) => r.data),
    onSuccess: (data) => toast.success(data.message ?? 'User session terminated'),
    onError: () => toast.error('Failed to terminate session'),
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Lock className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security</h1>
          <p className="text-sm text-muted-foreground">
            Session management and password administration
          </p>
        </div>
      </div>

      {/* Force Logout All — Danger Zone */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldOff className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <h3 className="font-semibold text-foreground">Force Logout All Users</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Immediately invalidates all active sessions system-wide. Every logged-in user will
                be redirected to the login page on their next API call.
                <strong className="block mt-1 text-destructive">This cannot be undone.</strong>
              </p>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="shrink-0 gap-2">
                {loggingOutAll && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <ShieldOff className="h-3.5 w-3.5" />
                Force Logout All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Terminate All Sessions
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will immediately log out every user in the system. You will also be logged
                  out and redirected to the login page. Are you absolutely sure?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => forceLogoutAll()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, Terminate All Sessions
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Per-User Actions */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-semibold text-foreground">User Session Control</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Force logout or reset password for individual users
          </p>
        </div>

        <div className="divide-y divide-border">
          {staff.map((member) => (
            <div key={member.staffId} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {member.firstName} {member.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {member.username} · {member.jobTitle}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => setResetTarget({ userUuid: member.uuid, username: member.username })}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Reset Password
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs text-destructive hover:text-destructive"
                  disabled={loggingOutUser && loggingOutId === member.uuid}
                  onClick={() => forceLogoutUser(member.uuid)}
                >
                  {loggingOutUser && loggingOutId === member.uuid
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <UserX className="h-3.5 w-3.5" />
                  }
                  Force Logout
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reset Password Dialog */}
      {resetTarget && (
        <ResetPasswordDialog
          userId={resetTarget.userUuid}
          username={resetTarget.username}
          open={true}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  )
}
