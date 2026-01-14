import { Navigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'

const roleToDashboardPath: Record<string, string> = {
  // Add real role-based dashboards here when routes exist.
  // Example:
  // ADMIN: '/admin',
  // TEACHER: '/academics',
}

const getDashboardPathForRoles = (roles: string[] | undefined | null): string => {
  const normalized = Array.isArray(roles) ? roles.map((r) => String(r).trim()).filter(Boolean) : []
  for (const role of normalized) {
    const mapped = roleToDashboardPath[role]
    if (mapped) return mapped
  }
  return '/'
}

export function GuestOnly({ children }: { children: React.ReactNode }) {
  // Prevent logged-in users from visiting routes intended for guests (e.g. /login).
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const roles = useAppSelector((s) => s.auth.user?.roles)

  if (isAuthenticated) {
    return <Navigate to={getDashboardPathForRoles(roles)} replace />
  }

  return children
}
