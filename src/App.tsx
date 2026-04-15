import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { Toaster } from '@/components/ui/sonner'
import AdminLayout from '@/components/layout/AdminLayout'

import TeacherDashboard from '@/pages/dashboard/teacher/page'
import StudentLayout from '@/components/layout/StudentLayout'
import { GuestOnly } from '@/routes/GuestOnly'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { RoleBasedRoute } from '@/routes/RoleBasedRoute'
import SessionExpiredDialog from '@/components/common/SessionExpiredDialog'
// SuperAdmin
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import SecurityGuardLayout from '@/components/layout/SecurityGuardLayout';
import TeacherLayout from './components/layout/TeacherLayout'
import AdminTransportPage from './pages/dashboard/admin/transport/page'

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
const ExaminationsPage = lazy(() => import('@/pages/dashboard/admin/examinations/page'))
const AdminRoomsPage = lazy(() => import('@/pages/dashboard/admin/rooms/page'))
const AdminFinancePage = lazy(() => import('@/pages/dashboard/admin/finance/page'))
const IdCardsPage = lazy(() => import('@/pages/dashboard/admin/id-cards/page'))
const AdminHrmsPage = lazy(() => import('@/pages/dashboard/admin/hrms/page'))

const TeacherDashboardPage = lazy(() => import('@/pages/dashboard/teacher/page'))
const TeacherProfilePage = lazy(() => import('@/pages/dashboard/teacher/profile/page'))
const TeacherSchedulePage = lazy(() => import('@/pages/dashboard/teacher/schedule/page'))
const TeacherSelfAttendancePage = lazy(() => import('@/pages/dashboard/teacher/self-attendance/page'))
const TeacherAttendancePage = lazy(() => import('@/pages/dashboard/teacher/attendance/page'))
const TeacherClassesPage = lazy(() => import('@/pages/dashboard/teacher/classes/page'))
const TeacherMyHrPage = lazy(() => import('@/pages/dashboard/teacher/my-hr/page'))
const TeacherEvaluationPage = lazy(() => import('@/pages/dashboard/teacher/evaluation/page'))
const TeacherMyClassPage = lazy(() => import('@/pages/dashboard/teacher/my-class/page'))
const TeacherLectureLogsPage = lazy(() => import('@/pages/dashboard/teacher/lecture-logs/page'))

const StudentDashboard = lazy(() => import('@/pages/dashboard/student/page'))
const StudentProfilePage = lazy(() => import('@/pages/dashboard/student/profile/page'))
const StudentTimetablePage = lazy(() => import('@/pages/dashboard/student/timetable/page'))
const StudentResultsPage = lazy(() => import('@/pages/dashboard/student/results/page'))
const StudentPastPapersPage = lazy(() => import('@/pages/dashboard/student/past-papers/page'))
const StudentAdmitCardsPage = lazy(() => import('@/pages/dashboard/student/admit-cards/page'))

const SecurityGuardDashboard = lazy(() => import('@/pages/dashboard/security-guard/page'))
const SecurityGuardVisitorManagement = lazy(() => import('@/pages/dashboard/security-guard/visitor-management/page'))
const SecurityGuardPickupScannerPage = lazy(() => import('@/pages/dashboard/security-guard/pickup-scanner/page'))
const AdminVisitorLogsPage = lazy(() => import('@/pages/dashboard/admin/visitor-logs/page'))
const AdminPickupLogsPage = lazy(() => import('@/pages/dashboard/admin/pickup-logs/page'))
const StudentPickupPage = lazy(() => import('@/pages/dashboard/student/pickup/page'))


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
          <Route path="examinations" element={withRouteSuspense(<ExaminationsPage />)} />
          <Route path="rooms" element={withRouteSuspense(<AdminRoomsPage />)} />
          <Route path="finance" element={withRouteSuspense(<AdminFinancePage />)} />
          <Route path="hrms" element={withRouteSuspense(<AdminHrmsPage />)} />
          <Route path="transport" element={<AdminTransportPage />} />

          <Route path="id-cards" element={withRouteSuspense(<IdCardsPage />)} />
          <Route path="users/:type/:id" element={withRouteSuspense(<UserDetailsPage />)} />
          <Route path="visitor-logs" element={withRouteSuspense(<AdminVisitorLogsPage />)} />
          <Route path="pickup-logs" element={withRouteSuspense(<AdminPickupLogsPage />)} />
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
          <Route index element={withRouteSuspense(<TeacherDashboardPage />)} />
          <Route path="my-class" element={withRouteSuspense(<TeacherMyClassPage />)} />
          <Route path="self-attendance" element={withRouteSuspense(<TeacherSelfAttendancePage />)} />
          <Route path="attendance" element={withRouteSuspense(<TeacherAttendancePage />)} />
          <Route path="classes" element={withRouteSuspense(<TeacherClassesPage />)} />
          <Route path="profile" element={withRouteSuspense(<TeacherProfilePage />)} />
          <Route path="schedule" element={withRouteSuspense(<TeacherSchedulePage />)} />
          <Route path="my-hr" element={withRouteSuspense(<TeacherMyHrPage />)} />
          <Route path="lecture-logs" element={withRouteSuspense(<TeacherLectureLogsPage />)} />
          <Route path="evaluation" element={withRouteSuspense(<TeacherEvaluationPage />)} />
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
          <Route path="timetable" element={withRouteSuspense(<StudentTimetablePage />)} />
          <Route path="pickup" element={withRouteSuspense(<StudentPickupPage />)} />
        </Route>

        {/* Security Guard Dashboard */}
        <Route
          path="/dashboard/security-guard"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'SECURITY_GUARD']}>
                <SecurityGuardLayout />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={withRouteSuspense(<SecurityGuardDashboard />)} />
          <Route path="visitor-management" element={withRouteSuspense(<SecurityGuardVisitorManagement />)} />
          <Route path="pickup-scanner" element={withRouteSuspense(<SecurityGuardPickupScannerPage />)} />
          <Route path="*" element={<Navigate to="/dashboard/security-guard" replace />} />
          <Route path="results" element={withRouteSuspense(<StudentResultsPage />)} />
          <Route path="past-papers" element={withRouteSuspense(<StudentPastPapersPage />)} />
          <Route path="admit-cards" element={withRouteSuspense(<StudentAdmitCardsPage />)} />
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
