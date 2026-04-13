import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import HrmsDashboard from "@/features/hrms/HrmsDashboard";
import LeaveCalendarDesigner from "@/features/hrms/LeaveCalendarDesigner";
import LeaveTypeConfig from "@/features/hrms/LeaveTypeConfig";
import StaffGradingTab from "@/features/hrms/StaffGradingTab";
import StaffAttendanceTab from "@/features/hrms/StaffAttendanceTab";
import DesignationManagement from "@/features/hrms/DesignationManagement";
import ShiftManagement from "@/features/hrms/ShiftManagement";
import StudentAttendanceReview from "@/features/hrms/StudentAttendanceReview";
import AttendanceTrendDashboard from "@/features/hrms/AttendanceTrendDashboard";
import {
  LayoutDashboard, CalendarDays, CheckSquare, Building2, Award,
  ClipboardCheck, GraduationCap, TrendingUp, Clock, Wallet, CreditCard,
} from "lucide-react";

const LeaveManagement = lazy(() => import("@/features/hrms/LeaveManagement"));
const SalaryComponents = lazy(() => import("@/features/hrms/SalaryComponents"));
const SalaryTemplateBuilder = lazy(() => import("@/features/hrms/SalaryTemplateBuilder"));
const SalaryStaffMapping = lazy(() => import("@/features/hrms/SalaryStaffMapping"));
const PayrollProcessing = lazy(() => import("@/features/hrms/PayrollProcessing"));
const PayslipTable = lazy(() => import("@/features/hrms/PayslipTable"));

export default function AdminHrmsPage() {
  const tabLoadingFallback = (
    <Card>
      <CardContent className="py-6 text-sm text-muted-foreground">Loading module...</CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">HRMS</h1>
        <p className="text-sm text-muted-foreground">
          Human resource setup and payroll operations are available here.
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="h-auto flex flex-wrap justify-start gap-1 bg-muted/60 p-1.5 rounded-xl">
          <TabsTrigger value="dashboard" className="gap-1.5 text-xs"><LayoutDashboard className="h-3.5 w-3.5" />Dashboard</TabsTrigger>
          <TabsTrigger value="leaves" className="gap-1.5 text-xs"><CalendarDays className="h-3.5 w-3.5" />Leaves</TabsTrigger>
          <TabsTrigger value="leave-workflows" className="gap-1.5 text-xs"><CheckSquare className="h-3.5 w-3.5" />Leave Approval</TabsTrigger>
          <TabsTrigger value="designations" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" />Designations</TabsTrigger>
          <TabsTrigger value="grades" className="gap-1.5 text-xs"><Award className="h-3.5 w-3.5" />Grades</TabsTrigger>
          <TabsTrigger value="attendance" className="gap-1.5 text-xs"><ClipboardCheck className="h-3.5 w-3.5" />Attendance</TabsTrigger>
          <TabsTrigger value="student-attendance" className="gap-1.5 text-xs"><GraduationCap className="h-3.5 w-3.5" />Students</TabsTrigger>
          <TabsTrigger value="trends" className="gap-1.5 text-xs"><TrendingUp className="h-3.5 w-3.5" />Trends</TabsTrigger>
          <TabsTrigger value="shifts" className="gap-1.5 text-xs"><Clock className="h-3.5 w-3.5" />Shifts</TabsTrigger>
          <TabsTrigger value="salary-setup" className="gap-1.5 text-xs"><Wallet className="h-3.5 w-3.5" />Salary</TabsTrigger>
          <TabsTrigger value="payroll" className="gap-1.5 text-xs"><CreditCard className="h-3.5 w-3.5" />Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <HrmsDashboard />
        </TabsContent>

        <TabsContent value="leaves" className="mt-4">
          <div className="space-y-8">
            <LeaveCalendarDesigner />
            <LeaveTypeConfig />
          </div>
        </TabsContent>

        <TabsContent value="leave-workflows" className="mt-4">
          <Suspense fallback={tabLoadingFallback}>
            <LeaveManagement />
          </Suspense>
        </TabsContent>

        <TabsContent value="designations" className="mt-4">
          <DesignationManagement />
        </TabsContent>

        <TabsContent value="grades" className="mt-4">
          <StaffGradingTab />
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <StaffAttendanceTab />
        </TabsContent>

        <TabsContent value="student-attendance" className="mt-4">
          <StudentAttendanceReview />
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <AttendanceTrendDashboard />
        </TabsContent>

        <TabsContent value="shifts" className="mt-4">
          <ShiftManagement />
        </TabsContent>

        <TabsContent value="salary-setup" className="mt-4">
          <Suspense fallback={tabLoadingFallback}>
            <div className="space-y-8">
              <SalaryComponents />
              <SalaryTemplateBuilder />
              <SalaryStaffMapping />
            </div>
          </Suspense>
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <Suspense fallback={tabLoadingFallback}>
            <div className="space-y-8">
              <PayrollProcessing />
              <Card>
                <CardContent className="py-6">
                  <PayslipTable />
                </CardContent>
              </Card>
            </div>
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
