import { Navigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'

interface RoleBasedRouteProps {
  children: React.ReactNode
  allowedRoles: string[]
}

/**
 * RoleBasedRoute - A route guard that prevents unauthorized role access
 *
 * Usage:
 * <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
 *   <AdminDashboard />
 * </RoleBasedRoute>
 *
 * Features:
 * - Checks if user is authenticated
 * - Verifies user has at least one of the allowed roles
 * - Redirects to login if not authenticated
 * - Redirects to appropriate dashboard if role not authorized
 */
export function RoleBasedRoute({ children, allowedRoles }: RoleBasedRouteProps) {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const userRoles = useAppSelector((s) => s.auth.user?.roles)

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Helper function to normalize role names (strip ROLE_ prefix if present)
  const normalizeRole = (role: string): string => {
    const upper = role.toUpperCase().trim()
    return upper.startsWith('ROLE_') ? upper.substring(5) : upper
  }

  // Normalize allowed roles to uppercase and strip ROLE_ prefix
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole)

  // Check if user has any of the allowed roles
  const hasRequiredRole =
    Array.isArray(userRoles) &&
    userRoles.some((role) => normalizedAllowedRoles.includes(normalizeRole(role)))

  // User authenticated but doesn't have required role
  if (!hasRequiredRole) {
    // Redirect to the user's default dashboard based on their roles
    const defaultPaths: Record<string, string> = {
      SUPER_ADMIN: '/dashboard/super-admin',
      SCHOOL_ADMIN: '/dashboard/admin',
      ADMIN: '/dashboard/admin',
      EXAM_CONTROLLER: '/dashboard/exam-controller',
      TEACHER: '/dashboard/teacher',
      SECURITY_GUARD: '/dashboard/security-guard',
      STUDENT: '/dashboard/student',
      APPLICANT: '/dashboard/applicant',
      PARENT: '/dashboard/parent',
      GUARDIAN: '/dashboard/parent',
      FINANCE_ADMIN: '/dashboard/admin/finance',
      AUDITOR: '/dashboard/admin/finance',
    }

    // Find first matching role's dashboard (normalize role before lookup)
    const defaultDashboard = userRoles?.find((role) => defaultPaths[normalizeRole(role)])
    const redirectPath = defaultDashboard
      ? defaultPaths[normalizeRole(defaultDashboard)]
      : '/dashboard/student'

    return <Navigate to={redirectPath} replace />
  }

  // User is authenticated and has required role
  return children
}
