import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard, CalendarDays, CheckSquare, Building2, Award,
  ClipboardCheck, TrendingUp, Clock, Wallet, CreditCard, Loader2,
} from "lucide-react";

const HrmsDashboard           = lazy(() => import("@/features/hrms/HrmsDashboard"));
const LeaveCalendarDesigner   = lazy(() => import("@/features/hrms/LeaveCalendarDesigner"));
const LeaveTypeConfig         = lazy(() => import("@/features/hrms/LeaveTypeConfig"));
const StaffGradingTab         = lazy(() => import("@/features/hrms/StaffGradingTab"));
const StaffAttendanceTab      = lazy(() => import("@/features/hrms/StaffAttendanceTab"));
const DesignationManagement   = lazy(() => import("@/features/hrms/DesignationManagement"));
const ShiftManagement         = lazy(() => import("@/features/hrms/ShiftManagement"));
const AttendanceTrendDashboard = lazy(() => import("@/features/hrms/AttendanceTrendDashboard"));
const LeaveManagement         = lazy(() => import("@/features/hrms/LeaveManagement"));
const SalaryComponents        = lazy(() => import("@/features/hrms/SalaryComponents"));
const SalaryTemplateBuilder   = lazy(() => import("@/features/hrms/SalaryTemplateBuilder"));
const SalaryStaffMapping      = lazy(() => import("@/features/hrms/SalaryStaffMapping"));
const PayrollProcessing       = lazy(() => import("@/features/hrms/PayrollProcessing"));
const PayslipTable            = lazy(() => import("@/features/hrms/PayslipTable"));

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
      <span className="text-sm">Loading module…</span>
    </div>
  );
}

const TABS = [
  { value: "dashboard",      label: "Dashboard",      icon: LayoutDashboard, emoji: "📊" },
  { value: "leaves",         label: "Leaves",         icon: CalendarDays,    emoji: "🌿" },
  { value: "leave-workflows",label: "Approvals",      icon: CheckSquare,     emoji: "✅" },
  { value: "designations",   label: "Designations",   icon: Building2,       emoji: "🏢" },
  { value: "grades",         label: "Grades",         icon: Award,           emoji: "🏆" },
  { value: "attendance",     label: "Attendance",     icon: ClipboardCheck,  emoji: "📋" },
  { value: "trends",         label: "Trends",         icon: TrendingUp,      emoji: "📈" },
  { value: "shifts",         label: "Shifts",         icon: Clock,           emoji: "⏰" },
  { value: "salary-setup",   label: "Salary",         icon: Wallet,          emoji: "💰" },
  { value: "payroll",        label: "Payroll",        icon: CreditCard,      emoji: "💳" },
];

export default function AdminHrmsPage() {
  return (
    <div className="min-h-screen">
      {/* ── Module Header ─────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 px-6 py-5 mb-4 shadow-lg">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white" />
          <div className="absolute -bottom-20 left-0 h-44 w-44 rounded-full bg-white" />
        </div>
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm text-2xl shadow-inner">
            👩‍💼
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Human Resources Management
            </h1>
            <p className="text-sm text-white/70">
              Staff, attendance, payroll, leaves & workforce operations
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        {/* ── Sticky unified tab bar ───────────────────────────────── */}
        <TabsList className="sticky top-2 z-20 h-auto flex flex-wrap justify-start gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-800 p-2 rounded-2xl shadow-sm mb-6">
          {TABS.map(({ value, label, emoji }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="
                gap-1.5 text-xs font-medium rounded-xl px-3 py-2 transition-all duration-150
                text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200
                data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600
                data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-violet-200
                dark:data-[state=active]:shadow-violet-900/30
              "
            >
              <span className="text-sm leading-none">{emoji}</span>
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard">
          <Suspense fallback={<TabLoader />}>
            <HrmsDashboard />
          </Suspense>
        </TabsContent>

        <TabsContent value="leaves">
          <Suspense fallback={<TabLoader />}>
            <div className="space-y-8">
              <LeaveCalendarDesigner />
              <LeaveTypeConfig />
            </div>
          </Suspense>
        </TabsContent>

        <TabsContent value="leave-workflows">
          <Suspense fallback={<TabLoader />}>
            <LeaveManagement />
          </Suspense>
        </TabsContent>

        <TabsContent value="designations">
          <Suspense fallback={<TabLoader />}>
            <DesignationManagement />
          </Suspense>
        </TabsContent>

        <TabsContent value="grades">
          <Suspense fallback={<TabLoader />}>
            <StaffGradingTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="attendance">
          <Suspense fallback={<TabLoader />}>
            <StaffAttendanceTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="trends">
          <Suspense fallback={<TabLoader />}>
            <AttendanceTrendDashboard />
          </Suspense>
        </TabsContent>

        <TabsContent value="shifts">
          <Suspense fallback={<TabLoader />}>
            <ShiftManagement />
          </Suspense>
        </TabsContent>

        <TabsContent value="salary-setup">
          <Suspense fallback={<TabLoader />}>
            <div className="space-y-8">
              <SalaryComponents />
              <SalaryTemplateBuilder />
              <SalaryStaffMapping />
            </div>
          </Suspense>
        </TabsContent>

        <TabsContent value="payroll">
          <Suspense fallback={<TabLoader />}>
            <div className="space-y-8">
              <PayrollProcessing />
              <PayslipTable />
            </div>
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
