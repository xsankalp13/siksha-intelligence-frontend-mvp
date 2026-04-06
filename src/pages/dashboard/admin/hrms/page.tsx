import { lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import HrmsDashboard from "@/features/hrms/HrmsDashboard";
import LeaveCalendarDesigner from "@/features/hrms/LeaveCalendarDesigner";
import LeaveTypeConfig from "@/features/hrms/LeaveTypeConfig";
import StaffGradingTab from "@/features/hrms/StaffGradingTab";
import StaffAttendanceTab from "@/features/hrms/StaffAttendanceTab";
import DesignationManagement from "@/features/hrms/DesignationManagement";

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
        <TabsList className="grid w-full grid-cols-2 md:w-[1120px] md:grid-cols-8">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
          <TabsTrigger value="leave-workflows">Leave Approval</TabsTrigger>
          <TabsTrigger value="designations">Designations</TabsTrigger>
          <TabsTrigger value="grades">Staff Grades</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="salary-setup">Salary Setup</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
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
                <CardHeader>
                  <CardTitle>Payslips</CardTitle>
                  <CardDescription>
                    Review generated payslips and download admin/self PDF variants.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PayslipTable />
                </CardContent>
              </Card>
            </div>
          </Suspense>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role Smoke Checklist</CardTitle>
          <CardDescription>
            Quick verification matrix for visibility and guarded payroll actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>SUPER_ADMIN: verify all HRMS tabs are visible and payroll run/approve/disburse buttons are enabled by status.</p>
          <p>ADMIN/SCHOOL_ADMIN: verify HRMS tabs are visible and payroll actions follow status guards (`PROCESSED` for Approve, `APPROVED` for Disburse).</p>
          <p>TEACHER: verify access is limited to `/dashboard/teacher/my-hr` self-service and no admin payroll action controls are available.</p>
        </CardContent>
      </Card>
    </div>
  );
}
