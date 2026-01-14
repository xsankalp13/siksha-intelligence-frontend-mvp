import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { Toaster } from '@/components/ui/sonner'
import LoginPage from '@/features/auth/LoginPage'
import HomePage from '@/pages/HomePage'
import SuperAdminDashboard from '@/pages/dashboard/super-admin/page'
import AdminDashboard from '@/pages/dashboard/admin/page'
import TeacherDashboard from '@/pages/dashboard/teacher/page'
import StudentDashboard from '@/pages/dashboard/student/page'
import { GuestOnly } from '@/routes/GuestOnly'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { RoleBasedRoute } from '@/routes/RoleBasedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Guest-only route: authenticated users are redirected away. */}
        <Route
          path="/login"
          element={
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          }
        />
        
        {/* Protected routes: require authentication */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />

        {/* SuperAdmin Dashboard - only SUPER_ADMIN role */}
        <Route
          path="/dashboard/super-admin"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminDashboard />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        {/* Admin Dashboard - SUPER_ADMIN or ADMIN roles */}
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                <AdminDashboard />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        {/* Teacher Dashboard - SUPER_ADMIN, ADMIN, or TEACHER roles */}
        <Route
          path="/dashboard/teacher"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER']}>
                <TeacherDashboard />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        {/* Student Dashboard - All roles (students and above) */}
        <Route
          path="/dashboard/student"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT']}>
                <StudentDashboard />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        />

        {/* Redirect all unknown routes to home (which will redirect to login if not authenticated) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster richColors />
    </BrowserRouter>
  )
}
