import { useMemo, useState } from "react";
import { BookOpen, Users } from "lucide-react";
import DataTable from "@/components/common/DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTeacherClasses, useTeacherStudents } from "@/features/teacher/queries/useTeacherQueries";
import StudentQuickView from "@/features/teacher/components/StudentQuickView";
import { UserAvatar } from "@/components/shared/UserAvatar";
import type { SubjectItem } from "@/services/types/teacher";

const SUBJECT_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
];

function subjectColor(code: string): string {
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) {
    hash = (hash * 31 + code.charCodeAt(i)) | 0;
  }
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

export default function TeacherClassesPage() {
  const { data: classes = [] } = useTeacherClasses();
  const [active, setActive] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const activeClass = useMemo(
    () => classes.find((c) => `${c.classUuid}:${c.sectionUuid}` === active) ?? null,
    [active, classes]
  );

  const { data: students } = useTeacherStudents(
    activeClass
      ? {
          classUuid: activeClass.classUuid,
          sectionUuid: activeClass.sectionUuid,
          search,
          page: 0,
          size: 100,
        }
      : undefined,
    Boolean(activeClass)
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-bold">My Classes</h1>
        <p className="text-sm text-muted-foreground">Subject classes assigned to you, with roster quick-view.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {classes.map((c) => {
          const key = `${c.classUuid}:${c.sectionUuid}`;
          const selected = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={`rounded-xl border p-4 text-left transition ${
                selected
                  ? "border-primary bg-primary/5 shadow-md"
                  : c.classTeacher
                    ? "border-l-4 border-l-emerald-500 border-border bg-card hover:bg-accent/30"
                    : "border-border bg-card hover:bg-accent/30"
              }`}
            >
              <p className="text-base font-semibold text-foreground">{c.className} - {c.sectionName}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" /> {c.studentCount} students</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.subjects.map((s: SubjectItem) => (
                  <span key={s.uuid} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${subjectColor(s.subjectCode)}`}>
                    {s.subjectCode}
                  </span>
                ))}
              </div>
              {c.classTeacher ? <p className="mt-2 text-xs font-semibold text-primary">Homeroom (CT)</p> : null}
            </button>
          );
        })}
      </div>

      {activeClass ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">{activeClass.className} - {activeClass.sectionName} Roster</h2>
            <div className="flex items-center gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student"
                className="w-[220px]"
              />
              <Button variant="outline" size="sm"><BookOpen className="mr-1 h-4 w-4" />View Detail</Button>
            </div>
          </div>

          <DataTable
            columns={[
              {
                key: "name",
                header: "Student",
                render: (row) => {
                  const full = `${row.firstName} ${row.lastName}`;
                  return (
                    <StudentQuickView student={row}>
                      <div className="inline-flex cursor-pointer items-center gap-2">
                        <UserAvatar name={full} profileUrl={row.profileUrl} className="h-7 w-7" />
                        <span className="font-medium hover:underline">{full}</span>
                      </div>
                    </StudentQuickView>
                  );
                },
                searchable: true,
              },
              { key: "rollNumber", header: "Roll #", searchable: true },
              {
                key: "attendancePercentage",
                header: "Attendance",
                render: (row) => `${Number(row.attendancePercentage ?? 0).toFixed(1)}%`,
              },
              { key: "guardianName", header: "Guardian" },
            ]}
            data={students?.content ?? []}
            getRowId={(row) => row.uuid}
            searchPlaceholder="Search roster"
          />
        </div>
      ) : null}
    </div>
  );
}
