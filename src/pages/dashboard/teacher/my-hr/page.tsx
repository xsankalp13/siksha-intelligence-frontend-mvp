import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeacherMyPayslips from "@/features/hrms/TeacherMyPayslips";
import TeacherMyLeaves from "@/features/hrms/TeacherMyLeaves";
import TeacherMyAttendance from "@/features/hrms/TeacherMyAttendance";
import TeacherMySalary from "@/features/hrms/TeacherMySalary";
import TeacherMyLoans from "@/features/hrms/TeacherMyLoans";
import TeacherMyExpenses from "@/features/hrms/TeacherMyExpenses";
import TeacherMyOvertime from "@/features/hrms/TeacherMyOvertime";

export default function TeacherMyHrPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My HR</h1>
        <p className="text-sm text-muted-foreground">
          Self-service leaves, attendance, payslips, salary, loans, expenses, and overtime.
        </p>
      </div>

      <Tabs defaultValue="leaves" className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:w-full lg:grid-cols-7">
          <TabsTrigger value="leaves">My Leaves</TabsTrigger>
          <TabsTrigger value="attendance">My Attendance</TabsTrigger>
          <TabsTrigger value="payslips">My Payslips</TabsTrigger>
          <TabsTrigger value="salary">My Salary</TabsTrigger>
          <TabsTrigger value="loans">My Loans</TabsTrigger>
          <TabsTrigger value="expenses">My Expenses</TabsTrigger>
          <TabsTrigger value="overtime">My Overtime</TabsTrigger>
        </TabsList>

        <TabsContent value="leaves" className="mt-4">
          <TeacherMyLeaves />
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <TeacherMyAttendance />
        </TabsContent>

        <TabsContent value="payslips" className="mt-4">
          <TeacherMyPayslips />
        </TabsContent>

        <TabsContent value="salary" className="mt-4">
          <TeacherMySalary />
        </TabsContent>

        <TabsContent value="loans" className="mt-4">
          <TeacherMyLoans />
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <TeacherMyExpenses />
        </TabsContent>

        <TabsContent value="overtime" className="mt-4">
          <TeacherMyOvertime />
        </TabsContent>
      </Tabs>
    </div>
  );
}
