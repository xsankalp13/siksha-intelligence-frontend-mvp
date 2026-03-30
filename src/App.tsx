import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { Toaster } from '@/components/ui/sonner'
import LoginPage from '@/features/auth/LoginPage'
import HomePage from '@/pages/HomePage'
import SuperAdminDashboard from '@/pages/dashboard/super-admin/page'
import AdminLayout from '@/components/layout/AdminLayout'
import AdminOverview from '@/pages/dashboard/admin/page'
import StudentsPage from '@/pages/dashboard/admin/students/page'
import StaffPage from '@/pages/dashboard/admin/staff/page'
import SettingsPage from '@/pages/dashboard/admin/settings/page'
import AdminTimetablePage from '@/pages/dashboard/admin/timetable/page'
import AdminTimetableEditorPage from '@/pages/dashboard/admin/timetable/editor/page'
import AdminTimetableReaderPage from '@/pages/dashboard/admin/timetable/reader/page'
import AdminTimeslotsPage from '@/pages/dashboard/admin/timeslots/page'
import UserDetailsPage from '@/pages/dashboard/admin/users/[id]/page'
import CurriculumPage from '@/pages/dashboard/admin/curriculum/page'

import ExaminationsPage from '@/pages/dashboard/admin/examinations/page'

import AdminRoomsPage from '@/pages/dashboard/admin/rooms/page'

import TeacherDashboard from '@/pages/dashboard/teacher/page'
import StudentDashboard from '@/pages/dashboard/student/page'
import StudentProfilePage from '@/pages/dashboard/student/profile/page'
import StudentLayout from '@/components/layout/StudentLayout'
import { GuestOnly } from '@/routes/GuestOnly'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { RoleBasedRoute } from '@/routes/RoleBasedRoute'
import SessionExpiredDialog from '@/components/common/SessionExpiredDialog'

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

        {/* Admin Dashboard — nested layout with sidebar */}
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMIN']}>
                <AdminLayout />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="timetable" element={<AdminTimetablePage />} />
          <Route path="timetable/editor" element={<AdminTimetableEditorPage />} />
          <Route path="timetable/editor/:classId/:sectionId" element={<AdminTimetableEditorPage />} />
          <Route path="timetable/reader" element={<AdminTimetableReaderPage />} />
          <Route path="timetable/reader/:classId/:sectionId" element={<AdminTimetableReaderPage />} />
          <Route path="timeslots" element={<AdminTimeslotsPage />} />
          <Route path="curriculum" element={<CurriculumPage />} />
          <Route path="examinations" element={<ExaminationsPage />} />

          <Route path="rooms" element={<AdminRoomsPage />} />

          <Route path="users/:type/:id" element={<UserDetailsPage />} />
          {/* Catch-all for unknown admin sub-routes */}
          <Route path="*" element={<Navigate to="/dashboard/admin" replace />} />
        </Route>

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
                <StudentLayout />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="profile" element={<StudentProfilePage />} />
        </Route>

        {/* Redirect all unknown routes to home (which will redirect to login if not authenticated) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global session-expired modal — sits above all routes */}
      <SessionExpiredDialog />
      <Toaster richColors />
    </BrowserRouter>
  )
}
