import { useMemo, useState } from "react";
import DataTable from "@/components/common/DataTable";
import { Input } from "@/components/ui/input";
import { useTeacherHomeroom, useTeacherStudents } from "@/features/teacher/queries/useTeacherQueries";
import QuickAttendanceGrid from "@/features/teacher/components/QuickAttendanceGrid";
import StudentQuickView from "@/features/teacher/components/StudentQuickView";
import { UserAvatar } from "@/components/shared/UserAvatar";

export default function TeacherMyClassPage() {
  const { data: homeroom } = useTeacherHomeroom();
  const [search, setSearch] = useState("");

  const { data: students } = useTeacherStudents(
    homeroom?.classTeacher && homeroom.sectionUuid
      ? { sectionUuid: homeroom.sectionUuid, search, page: 0, size: 120 }
      : undefined,
    Boolean(homeroom?.classTeacher && homeroom.sectionUuid)
  );

  const atRisk = useMemo(() => homeroom?.atRiskStudents ?? [], [homeroom?.atRiskStudents]);

  if (!homeroom?.classTeacher) {
    return (
      <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-6 text-center">
        <h1 className="text-2xl font-bold">My Class</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You are not assigned as a class teacher for any section.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-bold">My Class - {homeroom.className}-{homeroom.sectionName}</h1>
        <p className="text-sm text-muted-foreground">
          Room {homeroom.defaultRoom?.roomName ?? "-"} · {homeroom.studentCount ?? 0} students
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold">Today&apos;s Attendance</h2>
        <QuickAttendanceGrid students={students?.content ?? []} sectionUuid={homeroom.sectionUuid ?? ""} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:col-span-5">
          <h2 className="mb-3 text-base font-semibold">At-Risk Students</h2>
          <div className="space-y-2">
            {atRisk.map((s) => (
              <div key={s.studentUuid} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.attendancePercentage.toFixed(1)}% · {s.consecutiveAbsences} consecutive absences</p>
              </div>
            ))}
            {atRisk.length === 0 ? <p className="text-sm text-muted-foreground">No at-risk students right now.</p> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:col-span-7">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Student Roster</h2>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or roll" className="w-[220px]" />
          </div>
          <DataTable
            columns={[
              {
                key: "name",
                header: "Student",
                searchable: true,
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
              },
              { key: "rollNumber", header: "Roll #" },
              {
                key: "attendancePercentage",
                header: "Attendance",
                render: (row) => `${Number(row.attendancePercentage ?? 0).toFixed(1)}%`,
              },
              { key: "guardianName", header: "Guardian" },
            ]}
            data={students?.content ?? []}
            getRowId={(row) => row.uuid}
          />
        </div>
      </div>
    </div>
  );
}
