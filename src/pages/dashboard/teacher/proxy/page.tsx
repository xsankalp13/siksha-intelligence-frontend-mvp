import { ArrowLeftRight } from "lucide-react";
import TeacherProxyDuties from "@/features/teacher/components/TeacherProxyDuties";
import { useTeacherSchedule } from "@/features/teacher/queries/useTeacherQueries";

export default function TeacherProxyPage() {
  const { data: schedule } = useTeacherSchedule();
  const staffUuid = schedule?.staffUuid ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ArrowLeftRight className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proxy Duties</h1>
          <p className="text-sm text-muted-foreground">
            Request a substitute, manage your cover duties, and view history
          </p>
        </div>
      </div>

      {staffUuid ? (
        <TeacherProxyDuties staffUuid={staffUuid} />
      ) : (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}
    </div>
  );
}
