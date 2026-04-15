import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { useEffect } from 'react'

export default function HomePage() {
  const navigate = useNavigate()
  const userRoles = useAppSelector((s) => s.auth.user?.roles)

  // Determine dashboard path based on user roles
  const getDashboardPath = () => {
    const roleToPath: Record<string, string> = {
      SUPER_ADMIN: '/dashboard/super-admin',
      SCHOOL_ADMIN: '/dashboard/admin',
      ADMIN: '/dashboard/admin',
      TEACHER: '/dashboard/teacher',
      STUDENT: '/dashboard/student',
      APPLICANT: '/dashboard/applicant',
    }

    // Helper to normalize role (strip ROLE_ prefix if present)
    const normalizeRole = (role: string): string => {
      const upper = role.toUpperCase().trim()
      return upper.startsWith('ROLE_') ? upper.substring(5) : upper
    }

    if (Array.isArray(userRoles) && userRoles.length > 0) {
      for (const role of userRoles) {
        const normalized = normalizeRole(role)
        const path = roleToPath[normalized]
        if (path) return path
      }
    }
    return '/dashboard/student'
  }

  // Auto-redirect to dashboard on mount
  useEffect(() => {
    const dashboardPath = getDashboardPath()
    navigate(dashboardPath, { replace: true })
  }, [userRoles, navigate])

  // Show a loading state while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-slate-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  )
}
