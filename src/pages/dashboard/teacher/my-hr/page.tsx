import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeacherMyPayslips from "@/features/hrms/TeacherMyPayslips";
import TeacherMyLeaves from "@/features/hrms/TeacherMyLeaves";
import TeacherMyAttendance from "@/features/hrms/TeacherMyAttendance";

export default function TeacherMyHrPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My HR</h1>
        <p className="text-sm text-muted-foreground">
          Self-service leaves, attendance, and payslips for teachers.
        </p>
      </div>

      <Tabs defaultValue="leaves" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-[520px]">
          <TabsTrigger value="leaves">My Leaves</TabsTrigger>
          <TabsTrigger value="attendance">My Attendance</TabsTrigger>
          <TabsTrigger value="payslips">My Payslips</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
