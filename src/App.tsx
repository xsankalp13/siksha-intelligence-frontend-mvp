import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { Toaster } from '@/components/ui/sonner'
import AdminLayout from '@/components/layout/AdminLayout'

import HrmsLayout from '@/components/layout/HrmsLayout'
import StudentLayout from '@/components/layout/StudentLayout'
import ParentLayout from '@/components/layout/ParentLayout'
import { GuestOnly } from '@/routes/GuestOnly'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { RoleBasedRoute } from '@/routes/RoleBasedRoute'
import SessionExpiredDialog from '@/components/common/SessionExpiredDialog'
// SuperAdmin
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';
import SecurityGuardLayout from '@/components/layout/SecurityGuardLayout';
import TeacherLayout from './components/layout/TeacherLayout'
import AdminTransportPage from './pages/dashboard/admin/transport/page'
import ApplicantLayout from './components/layout/ApplicantLayout'
import AdminHrmsPage from './pages/dashboard/admin/hrms/page'
import StudentTimetablePage from './pages/dashboard/student/timetable/page'
import StudentResultsPage from './pages/dashboard/student/results/page'
import StudentPastPapersPage from './pages/dashboard/student/past-papers/page'
import StudentAdmitCardsPage from './pages/dashboard/student/admit-cards/page'
import ExamControllerLayout from './components/layout/ExamControllerLayout'

const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'))
const ApplicantSignupPage = lazy(() => import('@/features/auth/ApplicantSignupPage'))
const HomePage = lazy(() => import('@/pages/HomePage'))
const AccessDeniedPage = lazy(() => import('@/pages/AccessDenied'))

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

// HRMS sub-modules (lazy-loaded per route)
const HrmsDashboard = lazy(() => import('@/features/hrms/HrmsDashboard'))
const DesignationManagement = lazy(() => import('@/features/hrms/DesignationManagement'))
const StaffGradingTab = lazy(() => import('@/features/hrms/StaffGradingTab'))
const StaffAttendanceTab = lazy(() => import('@/features/hrms/StaffAttendanceTab'))
const AttendanceTrendDashboard = lazy(() => import('@/features/hrms/AttendanceTrendDashboard'))
const ShiftManagement = lazy(() => import('@/features/hrms/ShiftManagement'))
const LeaveCalendarDesigner = lazy(() => import('@/features/hrms/LeaveCalendarDesigner'))
const LeaveTypeConfig = lazy(() => import('@/features/hrms/LeaveTypeConfig'))
const LeaveTemplateManager = lazy(() => import('@/features/hrms/LeaveTemplateManager'))
const LeaveManagement = lazy(() => import('@/features/hrms/LeaveManagement'))
const LeaveBalanceCards = lazy(() => import('@/features/hrms/LeaveBalanceCards'))
const SalaryComponents = lazy(() => import('@/features/hrms/SalaryComponents'))
const SalaryTemplateBuilder = lazy(() => import('@/features/hrms/SalaryTemplateBuilder'))
const SalaryStaffMapping = lazy(() => import('@/features/hrms/SalaryStaffMapping'))
const HrmsPayrollPage = lazy(() => import('@/pages/dashboard/admin/hrms/payroll/page'))
const PromotionManagement = lazy(() => import('@/features/hrms/PromotionManagement'))
const ApprovalCenter = lazy(() => import('@/features/hrms/ApprovalCenter'))
const ApprovalChainConfig = lazy(() => import('@/features/hrms/ApprovalChainConfig'))
const DocumentVault = lazy(() => import('@/features/hrms/DocumentVault'))
const OnboardingManagement = lazy(() => import('@/features/hrms/OnboardingManagement'))
const ExitManagement = lazy(() => import('@/features/hrms/ExitManagement'))
const PerformanceAppraisals = lazy(() => import('@/features/hrms/PerformanceAppraisals'))
const TrainingCatalog = lazy(() => import('@/features/hrms/TrainingCatalog'))
const LoanManagement = lazy(() => import('@/features/hrms/LoanManagement'))
const ExpenseClaims = lazy(() => import('@/features/hrms/ExpenseClaims'))
const OvertimeTracker = lazy(() => import('@/features/hrms/OvertimeTracker'))
const BankDetailsManager = lazy(() => import('@/features/hrms/BankDetailsManager'))
const StatutoryReports = lazy(() => import('@/features/hrms/StatutoryReports'))
const StatutorySettings = lazy(() => import('@/features/hrms/StatutorySettings'))
const Staff360ProfilePage = lazy(() => import('@/features/hrms/Staff360Profile'))
const LateClockInReview = lazy(() => import('@/features/hrms/LateClockInReview'))

const TeacherDashboardPage = lazy(() => import('@/pages/dashboard/teacher/page'))
const TeacherProfilePage = lazy(() => import('@/pages/dashboard/teacher/profile/page'))

const TeacherAttendancePage = lazy(() => import('@/pages/dashboard/teacher/attendance/page'))
const TeacherClassesPage = lazy(() => import('@/pages/dashboard/teacher/classes/page'))
const TeacherMyHrPage = lazy(() => import('@/pages/dashboard/teacher/my-hr/page'))
const TeacherMyClassPage = lazy(() => import('@/pages/dashboard/teacher/my-class/page'))
const TeacherLectureLogsPage = lazy(() => import('@/pages/dashboard/teacher/lecture-logs/page'))
const TeacherDisciplinePage = lazy(() => import('@/pages/dashboard/teacher/discipline/page'))
const TeacherEvaluationPage = lazy(() => import('@/pages/dashboard/teacher/evaluation/page'))
const TeacherSelfAttendancePage = lazy(() => import('@/pages/dashboard/teacher/self-attendance/page'))

const InvigilatorRoomsPage = lazy(() => import('@/pages/dashboard/invigilator/attendance/page'))
const RoomAttendancePage = lazy(() => import('@/pages/dashboard/invigilator/attendance/[roomId]/page'))

const StudentDashboard = lazy(() => import('@/pages/dashboard/student/page'))
const StudentProfilePage = lazy(() => import('@/pages/dashboard/student/profile/page'))

const SecurityGuardDashboard = lazy(() => import('@/pages/dashboard/security-guard/page'))
const SecurityGuardVisitorManagement = lazy(() => import('@/pages/dashboard/security-guard/visitor-management/page'))
const SecurityGuardPickupScannerPage = lazy(() => import('@/pages/dashboard/security-guard/pickup-scanner/page'))
const AdminVisitorLogsPage = lazy(() => import('@/pages/dashboard/admin/visitor-logs/page'))
const AdminPickupLogsPage = lazy(() => import('@/pages/dashboard/admin/pickup-logs/page'))
const AdminProxyDashboardPage = lazy(() => import('@/pages/dashboard/admin/proxy/page'))
const StudentPickupPage = lazy(() => import('@/pages/dashboard/student/pickup/page'))
const StudentDisciplinePage = lazy(() => import('@/pages/dashboard/student/discipline/page'))


const ParentDashboardPage = lazy(() => import('@/pages/dashboard/parent/page'))
const ParentAcademicsPage = lazy(() => import('@/pages/dashboard/parent/academics/page'))
const ParentAttendancePage = lazy(() => import('@/pages/dashboard/parent/attendance/page'))
const ParentHomeworkPage = lazy(() => import('@/pages/dashboard/parent/homework/page'))
const ParentFeesPage = lazy(() => import('@/pages/dashboard/parent/fees/page'))
const ParentCommunicationPage = lazy(() => import('@/pages/dashboard/parent/communication/page'))
const ParentCalendarPage = lazy(() => import('@/pages/dashboard/parent/calendar/page'))
const ParentTransportPage = lazy(() => import('@/pages/dashboard/parent/transport/page'))
const ParentHealthPage = lazy(() => import('@/pages/dashboard/parent/health/page'))
const ParentDocumentsPage = lazy(() => import('@/pages/dashboard/parent/documents/page'))
const ParentNotificationsPage = lazy(() => import('@/pages/dashboard/parent/notifications/page'))
const ParentProfilePage = lazy(() => import('@/pages/dashboard/parent/profile/page'))
const ParentStudentProfilePage = lazy(() => import('@/pages/dashboard/parent/student-profile/page'))

const SuperAdminOverviewPage = lazy(() => import('@/pages/dashboard/super-admin/overview/page'))
const SuperAdminUsersPage = lazy(() => import('@/pages/dashboard/super-admin/users/page'))
const SuperAdminRbacPage = lazy(() => import('@/pages/dashboard/super-admin/rbac/page'))
const SuperAdminHealthPage = lazy(() => import('@/pages/dashboard/super-admin/health/page'))
const SuperAdminAuditLogsPage = lazy(() => import('@/pages/dashboard/super-admin/audit-logs/page'))
const SuperAdminLogsPage = lazy(() => import('@/pages/dashboard/super-admin/logs/page'))
const SuperAdminConfigPage = lazy(() => import('@/pages/dashboard/super-admin/configuration/page'))
const SuperAdminSecurityPage = lazy(() => import('@/pages/dashboard/super-admin/security/page'))

const ApplicantOverviewPage = lazy(() => import('@/pages/dashboard/applicant/page'))
const AdmissionEnquiryPage = lazy(() => import('@/pages/dashboard/applicant/enquiry/page'))
const AdmissionFormPage = lazy(() => import('@/pages/dashboard/applicant/form/page'))
const AdmissionPaymentPage = lazy(() => import('@/pages/dashboard/applicant/payment/page'))
const AdminAdmissionDashboard = lazy(() => import('@/pages/dashboard/admin/admission/page'))
const AdminDisciplinePage = lazy(() => import('@/pages/dashboard/admin/discipline/page'))

const ExamControllerDashboardPage = lazy(() => import('@/pages/dashboard/exam-controller/page'))
const ExamControllerRoomPage = lazy(() => import('@/pages/dashboard/exam-controller/room/[roomId]/page'))
const ExamControllerClassPage = lazy(() => import('@/pages/dashboard/exam-controller/class/page'))
const ExamControllerExaminationsPage = lazy(() => import('@/pages/dashboard/exam-controller/examinations/page'))

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
        <Route
          path="/reset-password"
          element={
            <GuestOnly>
              {withRouteSuspense(<ResetPasswordPage />)}
            </GuestOnly>
          }
        />
        <Route
          path="/admission/signup"
          element={
            <GuestOnly>
              {withRouteSuspense(<ApplicantSignupPage />)}
            </GuestOnly>
          }
        />

        {/* 403 Access Denied page */}
        <Route
          path="/403"
          element={withRouteSuspense(<AccessDeniedPage />)} 
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

          <Route path="hrms" element={<HrmsLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={withRouteSuspense(<HrmsDashboard />)} />
            <Route path="people/designations" element={withRouteSuspense(<DesignationManagement />)} />
            <Route path="people/grades" element={withRouteSuspense(<StaffGradingTab />)} />
            <Route path="attendance" element={withRouteSuspense(<StaffAttendanceTab />)} />
            <Route path="attendance/trends" element={withRouteSuspense(<AttendanceTrendDashboard />)} />
            <Route path="attendance/shifts" element={withRouteSuspense(<ShiftManagement />)} />
            <Route path="attendance/late-clockin" element={withRouteSuspense(<LateClockInReview />)} />

            <Route path="leaves/calendar" element={withRouteSuspense(<LeaveCalendarDesigner />)} />
            <Route path="leaves/types" element={withRouteSuspense(<LeaveTypeConfig />)} />
            <Route path="leaves/templates" element={withRouteSuspense(<LeaveTemplateManager />)} />
            <Route path="leaves/applications" element={withRouteSuspense(<LeaveManagement />)} />
            <Route path="leaves/balances" element={withRouteSuspense(<LeaveBalanceCards />)} />
            <Route path="compensation/components" element={withRouteSuspense(<SalaryComponents />)} />
            <Route path="compensation/templates" element={withRouteSuspense(<SalaryTemplateBuilder />)} />
            <Route path="compensation/mappings" element={withRouteSuspense(<SalaryStaffMapping />)} />
            <Route path="bank-details" element={withRouteSuspense(<BankDetailsManager />)} />
            <Route path="payroll" element={withRouteSuspense(<HrmsPayrollPage />)} />
            <Route path="promotions" element={withRouteSuspense(<PromotionManagement />)} />
            <Route path="approvals" element={withRouteSuspense(<ApprovalCenter />)} />
            <Route path="approvals/config" element={withRouteSuspense(<ApprovalChainConfig />)} />
            <Route path="documents" element={withRouteSuspense(<DocumentVault />)} />
            <Route path="onboarding" element={withRouteSuspense(<OnboardingManagement />)} />
            <Route path="exit" element={withRouteSuspense(<ExitManagement />)} />
            <Route path="performance" element={withRouteSuspense(<PerformanceAppraisals />)} />
            <Route path="training" element={withRouteSuspense(<TrainingCatalog />)} />
            <Route path="loans" element={withRouteSuspense(<LoanManagement />)} />
            <Route path="expenses" element={withRouteSuspense(<ExpenseClaims />)} />
            <Route path="overtime" element={withRouteSuspense(<OvertimeTracker />)} />
            <Route path="reports" element={withRouteSuspense(<StatutoryReports />)} />
            <Route path="settings" element={withRouteSuspense(<StatutorySettings />)} />
            <Route path="staff/:staffRef" element={withRouteSuspense(<Staff360ProfilePage />)} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>
          <Route path="id-cards" element={withRouteSuspense(<IdCardsPage />)} />
          <Route path="users/:type/:id" element={withRouteSuspense(<UserDetailsPage />)} />
          <Route path="visitor-logs" element={withRouteSuspense(<AdminVisitorLogsPage />)} />
          <Route path="pickup-logs" element={withRouteSuspense(<AdminPickupLogsPage />)} />
          <Route path="proxy" element={withRouteSuspense(<AdminProxyDashboardPage />)} />
          <Route path="admission" element={withRouteSuspense(<AdminAdmissionDashboard />)} />
          <Route path="discipline" element={withRouteSuspense(<AdminDisciplinePage />)} />
          {/* Catch-all for unknown admin sub-routes */}
          <Route path="*" element={<Navigate to="/dashboard/admin" replace />} />
        </Route>

        {/* Applicant Dashboard */}
        <Route
          path="/dashboard/applicant"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['APPLICANT', 'ADMIN', 'SUPER_ADMIN']}>
                <ApplicantLayout />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={withRouteSuspense(<ApplicantOverviewPage />)} />
          <Route path="enquiry" element={withRouteSuspense(<AdmissionEnquiryPage />)} />
          <Route path="form" element={withRouteSuspense(<AdmissionFormPage />)} />
          <Route path="payment" element={withRouteSuspense(<AdmissionPaymentPage />)} />
          <Route path="*" element={<Navigate to="/dashboard/applicant" replace />} />
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
          <Route path="attendance" element={withRouteSuspense(<TeacherAttendancePage />)} />
          <Route path="self-attendance" element={withRouteSuspense(<TeacherSelfAttendancePage />)} />
          <Route path="classes" element={withRouteSuspense(<TeacherClassesPage />)} />
          <Route path="profile" element={withRouteSuspense(<TeacherProfilePage />)} />

          <Route path="my-hr" element={withRouteSuspense(<TeacherMyHrPage />)} />
          <Route path="lecture-logs" element={withRouteSuspense(<TeacherLectureLogsPage />)} />
          <Route path="evaluation" element={withRouteSuspense(<TeacherEvaluationPage />)} />
          <Route path="discipline" element={withRouteSuspense(<TeacherDisciplinePage />)} />
          <Route path="*" element={<Navigate to="/dashboard/teacher" replace />} />
        </Route>

        {/* Invigilator Routes */}
        <Route
          path="/dashboard/invigilator"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'TEACHER']}>
                <TeacherLayout />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        >
          <Route path="attendance" element={withRouteSuspense(<InvigilatorRoomsPage />)} />
          <Route path="attendance/:examScheduleId/:roomId" element={withRouteSuspense(<RoomAttendancePage />)} />
          <Route path="*" element={<Navigate to="/dashboard/invigilator/attendance" replace />} />
        </Route>

        {/* Exam Controller Routes */}
        <Route
          path="/dashboard/exam-controller"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMIN', 'EXAM_CONTROLLER']}>
                <ExamControllerLayout />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={withRouteSuspense(<ExamControllerDashboardPage />)} />
          <Route path="room/:roomId" element={withRouteSuspense(<ExamControllerRoomPage />)} />
          <Route path="class" element={withRouteSuspense(<ExamControllerClassPage />)} />
          <Route path="examinations" element={withRouteSuspense(<ExamControllerExaminationsPage />)} />
          <Route path="*" element={<Navigate to="/dashboard/exam-controller" replace />} />
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
          <Route path="discipline" element={withRouteSuspense(<StudentDisciplinePage />)} />
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

        {/* Parent Dashboard */}
        <Route
          path="/dashboard/parent"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'PARENT', 'GUARDIAN']}>
                <ParentLayout />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={withRouteSuspense(<ParentDashboardPage />)} />
          <Route path="academics" element={withRouteSuspense(<ParentAcademicsPage />)} />
          <Route path="attendance" element={withRouteSuspense(<ParentAttendancePage />)} />
          <Route path="homework" element={withRouteSuspense(<ParentHomeworkPage />)} />
          <Route path="fees" element={withRouteSuspense(<ParentFeesPage />)} />
          <Route path="communication" element={withRouteSuspense(<ParentCommunicationPage />)} />
          <Route path="calendar" element={withRouteSuspense(<ParentCalendarPage />)} />
          <Route path="transport" element={withRouteSuspense(<ParentTransportPage />)} />
          <Route path="health" element={withRouteSuspense(<ParentHealthPage />)} />
          <Route path="documents" element={withRouteSuspense(<ParentDocumentsPage />)} />
          <Route path="notifications" element={withRouteSuspense(<ParentNotificationsPage />)} />
          <Route path="profile" element={withRouteSuspense(<ParentProfilePage />)} />
          <Route path="student-profile" element={withRouteSuspense(<ParentStudentProfilePage />)} />
          <Route path="*" element={<Navigate to="/dashboard/parent" replace />} />
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
