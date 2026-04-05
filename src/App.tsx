import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { Toaster } from '@/components/ui/sonner'
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
import AdminFinancePage from './pages/dashboard/admin/finance/page'

import IdCardsPage from '@/pages/dashboard/admin/id-cards/page'
import TeacherLayout from '@/components/layout/TeacherLayout'
import TeacherDashboard from '@/pages/dashboard/teacher/page'
import TeacherProfile from '@/pages/dashboard/teacher/profile/page'
import TeacherSchedule from '@/pages/dashboard/teacher/schedule/page'
import TeacherAttendance from '@/pages/dashboard/teacher/attendance/page'
import TeacherClassRoster from '@/pages/dashboard/teacher/classes/page'
import StudentDashboard from '@/pages/dashboard/student/page'
import StudentProfilePage from '@/pages/dashboard/student/profile/page'
import StudentLayout from '@/components/layout/StudentLayout'
import TeacherLayout from '@/components/layout/TeacherLayout'
import { GuestOnly } from '@/routes/GuestOnly'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { RoleBasedRoute } from '@/routes/RoleBasedRoute'
import SessionExpiredDialog from '@/components/common/SessionExpiredDialog'
// SuperAdmin
import SuperAdminLayout from '@/components/layout/SuperAdminLayout'

const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const HomePage = lazy(() => import('@/pages/HomePage'))

const AdminOverview = lazy(() => import('@/pages/dashboard/admin/page'))
const StudentsPage = lazy(() => import('@/pages/dashboard/admin/students/page'))
const StaffPage = lazy(() => import('@/pages/dashboard/admin/staff/page'))
const SettingsPage = lazy(() => import('@/pages/dashboard/admin/settings/page'))
const AdminTimetablePage = lazy(() => import('@/pages/dashboard/admin/timetable/page'))
const AdminTimetableEditorPage = lazy(() => import('@/pages/dashboard/admin/timetable/editor/page'))
const AdminTimetableReaderPage = lazy(() => import('@/pages/dashboard/admin/timetable/reader/page'))
const AdminTimeslotsPage = lazy(() => import('@/pages/dashboard/admin/timeslots/page'))
const UserDetailsPage = lazy(() => import('@/pages/dashboard/admin/users/[id]/page'))
const CurriculumPage = lazy(() => import('@/pages/dashboard/admin/curriculum/page'))
const AdminRoomsPage = lazy(() => import('@/pages/dashboard/admin/rooms/page'))
const IdCardsPage = lazy(() => import('@/pages/dashboard/admin/id-cards/page'))
const AdminHrmsPage = lazy(() => import('@/pages/dashboard/admin/hrms/page'))

const TeacherDashboard = lazy(() => import('@/pages/dashboard/teacher/page'))
const TeacherMyHrPage = lazy(() => import('@/pages/dashboard/teacher/my-hr/page'))

const StudentDashboard = lazy(() => import('@/pages/dashboard/student/page'))
const StudentProfilePage = lazy(() => import('@/pages/dashboard/student/profile/page'))

const SuperAdminOverviewPage = lazy(() => import('@/pages/dashboard/super-admin/overview/page'))
const SuperAdminUsersPage = lazy(() => import('@/pages/dashboard/super-admin/users/page'))
const SuperAdminRbacPage = lazy(() => import('@/pages/dashboard/super-admin/rbac/page'))
const SuperAdminHealthPage = lazy(() => import('@/pages/dashboard/super-admin/health/page'))
const SuperAdminAuditLogsPage = lazy(() => import('@/pages/dashboard/super-admin/audit-logs/page'))
const SuperAdminLogsPage = lazy(() => import('@/pages/dashboard/super-admin/logs/page'))
const SuperAdminConfigPage = lazy(() => import('@/pages/dashboard/super-admin/configuration/page'))
const SuperAdminSecurityPage = lazy(() => import('@/pages/dashboard/super-admin/security/page'))

function withRouteSuspense(node: ReactNode) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      {node}
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Guest-only route: authenticated users are redirected away. */}
        <Route
          path="/login"
          element={
            <GuestOnly>
              {withRouteSuspense(<LoginPage />)}
            </GuestOnly>
          }
        />

        {/* Protected routes: require authentication */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              {withRouteSuspense(<HomePage />)}
            </ProtectedRoute>
          }
        />

        {/* SuperAdmin Dashboard — nested layout with sidebar */}
        <Route
          path="/dashboard/super-admin"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminLayout />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={withRouteSuspense(<SuperAdminOverviewPage />)} />
          <Route path="users" element={withRouteSuspense(<SuperAdminUsersPage />)} />
          <Route path="rbac" element={withRouteSuspense(<SuperAdminRbacPage />)} />
          <Route path="health" element={withRouteSuspense(<SuperAdminHealthPage />)} />
          <Route path="audit-logs" element={withRouteSuspense(<SuperAdminAuditLogsPage />)} />
          <Route path="logs" element={withRouteSuspense(<SuperAdminLogsPage />)} />
          <Route path="configuration" element={withRouteSuspense(<SuperAdminConfigPage />)} />
          <Route path="security" element={withRouteSuspense(<SuperAdminSecurityPage />)} />
          <Route path="*" element={<Navigate to="/dashboard/super-admin" replace />} />
        </Route>

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
          <Route path="finance" element={<AdminFinancePage />} />

          <Route path="id-cards" element={<IdCardsPage />} />
          <Route path="users/:type/:id" element={<UserDetailsPage />} />
          <Route index element={withRouteSuspense(<AdminOverview />)} />
          <Route path="students" element={withRouteSuspense(<StudentsPage />)} />
          <Route path="staff" element={withRouteSuspense(<StaffPage />)} />
          <Route path="settings" element={withRouteSuspense(<SettingsPage />)} />
          <Route path="timetable" element={withRouteSuspense(<AdminTimetablePage />)} />
          <Route path="timetable/editor" element={withRouteSuspense(<AdminTimetableEditorPage />)} />
          <Route path="timetable/editor/:classId/:sectionId" element={withRouteSuspense(<AdminTimetableEditorPage />)} />
          <Route path="timetable/reader" element={withRouteSuspense(<AdminTimetableReaderPage />)} />
          <Route path="timetable/reader/:classId/:sectionId" element={withRouteSuspense(<AdminTimetableReaderPage />)} />
          <Route path="timeslots" element={withRouteSuspense(<AdminTimeslotsPage />)} />
          <Route path="curriculum" element={withRouteSuspense(<CurriculumPage />)} />
          <Route path="rooms" element={withRouteSuspense(<AdminRoomsPage />)} />
          <Route path="hrms" element={withRouteSuspense(<AdminHrmsPage />)} />
          <Route path="id-cards" element={withRouteSuspense(<IdCardsPage />)} />
          <Route path="users/:type/:id" element={withRouteSuspense(<UserDetailsPage />)} />
          {/* Catch-all for unknown admin sub-routes */}
          <Route path="*" element={<Navigate to="/dashboard/admin" replace />} />
        </Route>

        {/* Teacher Dashboard — nested layout with sidebar */}
        <Route
          path="/dashboard/teacher"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER']}>
                <TeacherLayout />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={withRouteSuspense(<TeacherDashboard />)} />
          <Route path="my-hr" element={withRouteSuspense(<TeacherMyHrPage />)} />
          <Route path="*" element={<Navigate to="/dashboard/teacher" replace />} />
        </Route>

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
          <Route index element={withRouteSuspense(<StudentDashboard />)} />
          <Route path="profile" element={withRouteSuspense(<StudentProfilePage />)} />
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
