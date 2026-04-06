import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  TeacherDashboardSummaryResponseDto,
  TeacherHomeroomResponseDto,
  TeacherScheduleResponseDto,
} from "@/services/types/teacher";

type Props = {
  teacherName?: string;
  summary?: TeacherDashboardSummaryResponseDto;
  schedule?: TeacherScheduleResponseDto;
  homeroom?: TeacherHomeroomResponseDto;
};

function localKey(date: string) {
  return `teacher-briefing-dismissed-${date}`;
}

export default function DailyBriefing({ teacherName, summary, schedule, homeroom }: Props) {
  const dateKey = new Date().toISOString().slice(0, 10);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(localKey(dateKey)) === "1");

  const message = useMemo(() => {
    const next = summary?.nextClass;
    const risk = summary?.alerts.atRiskStudentCount ?? 0;
    const classLabel = next ? `${next.subject} (${next.className}-${next.sectionName})` : "no scheduled class";
    const roomLabel = next ? `${next.startTime} in ${next.room}` : "for today";
    const home = homeroom?.classTeacher ? `Homeroom: ${homeroom.className}-${homeroom.sectionName}.` : "";

    return `Today you have ${summary?.classesToday ?? 0} classes, starting with ${classLabel} at ${roomLabel}. ${risk} students need attention. ${home}`;
  }, [homeroom, summary]);

  if (dismissed) return null;

  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-slate-800 to-indigo-950/40 p-5 text-slate-100 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-300">
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </p>
          <h2 className="mt-1 text-xl font-semibold">Good day, {teacherName ?? schedule?.teacherName ?? "Teacher"}</h2>
          <p className="mt-2 text-sm text-slate-200/90">{message}</p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            localStorage.setItem(localKey(dateKey), "1");
            setDismissed(true);
          }}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
