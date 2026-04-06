import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/shared/UserAvatar";
import type { TeacherStudentResponseDto } from "@/services/types/teacher";

type Props = {
  student: TeacherStudentResponseDto;
  children: React.ReactNode;
};

export default function StudentQuickView({ student, children }: Props) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="top" className="w-72 rounded-xl border border-border bg-card p-3 text-foreground shadow-lg">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <UserAvatar name={`${student.firstName} ${student.lastName}`} profileUrl={student.profileUrl} className="h-8 w-8" />
              <div>
                <p className="text-sm font-semibold">{student.firstName} {student.lastName}</p>
                <p className="text-xs text-muted-foreground">{student.className}-{student.sectionName} · Roll {student.rollNumber}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Attendance</p>
              <Progress value={student.attendancePercentage} />
              <p className="mt-1 text-xs">{student.attendancePercentage?.toFixed(1)}%</p>
            </div>
            <p className="text-xs text-muted-foreground">Guardian: {student.guardianName} · {student.guardianPhone}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
