import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2 } from "lucide-react";
import { toast } from "sonner";
import { attendanceService } from "@/services/attendance";
import { handleAttendanceError } from "@/features/attendance/utils/attendanceError";
import { getLocalDateString } from "@/lib/dateUtils";
import { useAttendanceTypes, useCalendarEventsForDate } from "@/features/teacher/queries/useAttendanceQueries";
import type { StudentAttendanceRequestDTO } from "@/services/types/attendance";
import type { TeacherStudentResponseDto } from "@/services/types/teacher";
import AttendanceRoster from "./AttendanceRoster";
import SequentialMarkingView from "./SequentialMarkingView";
import SubmitConfirmDialog from "./SubmitConfirmDialog";
import type { LocalCode } from "./AttendanceRoster";

// ─────────────────────────────────────────────────────────────────────
// localStorage key for persisting the user's mode preference
type Mode = "roster" | "sequential";

// Separate localStorage keys per device class so a desktop session never
// overrides what a phone should see (and vice-versa).
function getModeKey(): string {
  return window.innerWidth < 768 ? "ams-marking-mode-mobile" : "ams-marking-mode-desktop";
}

function getDefaultMode(): Mode {
  const isMobile = window.innerWidth < 768;
  const stored = localStorage.getItem(getModeKey());
  if (stored === "roster" || stored === "sequential") return stored;
  // First visit: pick the sensible default for this device class
  return isMobile ? "sequential" : "roster";
}

// ─────────────────────────────────────────────────────────────────────
type Props = {
  students: TeacherStudentResponseDto[];
  sectionUuid: string;
  staffUuid: string;
  selectedDate?: string;
  initialRecords?: Record<string, string> | null;
  onSubmitSuccess?: () => void;
};

export default function QuickAttendanceGrid({
  students,
  sectionUuid,
  staffUuid,
  selectedDate,
  initialRecords,
  onSubmitSuccess,
}: Props) {
  // ── Attendance types (for short-code mapping) ──────────────────────
  const { data: attendanceTypes } = useAttendanceTypes();

  const shortCodeMap = useMemo(() => {
    if (!attendanceTypes || attendanceTypes.length === 0) return null;
    const pCode = attendanceTypes.find((t) => t.presentMark)?.shortCode;
    const aCode = attendanceTypes.find((t) => t.absenceMark)?.shortCode;
    const lCode = attendanceTypes.find((t) => t.lateMark)?.shortCode;
    return { P: pCode ?? "P", A: aCode ?? "A", L: lCode ?? "L" };
  }, [attendanceTypes]);

  // ── Calendar / holiday check ───────────────────────────────────────
  const attendanceDate = selectedDate || getLocalDateString();

  const { data: calendarEvents } = useCalendarEventsForDate(attendanceDate);

  const holidayEvent = useMemo(
    () =>
      calendarEvents?.find(
        (e) =>
          (e.dayType === "HOLIDAY" || e.dayType === "VACATION") &&
          e.date === attendanceDate
      ),
    [calendarEvents, attendanceDate]
  );
  const isHoliday = !!holidayEvent;

  // ── Convert initialRecords → LocalCode map ─────────────────────────
  const initialCodeMap = useMemo<Record<string, LocalCode>>(() => {
    const next: Record<string, LocalCode> = {};
    students.forEach((s) => {
      const backendCode = initialRecords?.[s.uuid];
      if (!backendCode) { next[s.uuid] = "P"; return; }
      if (backendCode === shortCodeMap?.A) next[s.uuid] = "A";
      else if (backendCode === shortCodeMap?.L) next[s.uuid] = "L";
      else next[s.uuid] = "P";
    });
    return next;
  }, [initialRecords, shortCodeMap, students]);

  // ── 🔑 Attendance state — single source of truth ──────────────────
  const [attendanceMap, setAttendanceMap] = useState<Record<string, LocalCode>>({});
  const [submitting, setSubmitting] = useState(false);

  // Sync when students load or initialRecords change
  useEffect(() => {
    setAttendanceMap(initialCodeMap);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, initialRecords, shortCodeMap]);

  const mark = (uuid: string, code: LocalCode) =>
    setAttendanceMap((prev) => ({ ...prev, [uuid]: code }));

  const markAll = (code: LocalCode) => {
    if (isHoliday) return;
    setAttendanceMap(
      students.reduce<Record<string, LocalCode>>((acc, s) => {
        acc[s.uuid] = code;
        return acc;
      }, {})
    );
  };

  const summary = useMemo(() => {
    const vals = Object.values(attendanceMap);
    return {
      P: vals.filter((v) => v === "P").length,
      A: vals.filter((v) => v === "A").length,
      L: vals.filter((v) => v === "L").length,
    };
  }, [attendanceMap]);

  // ── Submit ─────────────────────────────────────────────────────────
  const submit = async () => {
    if (students.length === 0) return;
    if (!shortCodeMap) {
      toast.error("Attendance types are not configured.");
      return;
    }
    setSubmitting(true);
    const payload: StudentAttendanceRequestDTO[] = students.map((student) => {
      const code = attendanceMap[student.uuid] ?? "P";
      return {
        studentUuid: student.uuid,
        attendanceShortCode: shortCodeMap[code] ?? "P",
        attendanceDate,
        takenByStaffUuid: staffUuid,
      };
    });
    try {
      await attendanceService.createStudentAttendanceBatch(payload);
      toast.success(`Attendance saved for ${sectionUuid}`);
      onSubmitSuccess?.();
    } catch (error) {
      handleAttendanceError(error, "Failed to submit attendance");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Mode (roster vs sequential) ────────────────────────────────────
  const [mode, setMode] = useState<Mode>(getDefaultMode);
  const [showConfirm, setShowConfirm] = useState(false);

  const switchMode = () => {
    const next: Mode = mode === "roster" ? "sequential" : "roster";
    setMode(next);
    localStorage.setItem(getModeKey(), next);
  };

  // ── Shared props ───────────────────────────────────────────────────
  const sharedProps = {
    students,
    state: attendanceMap,
    mark,
    summary,
    onSubmit: () => { setShowConfirm(true); return Promise.resolve(); },
    submitting,
    isHoliday,
    onSwitchMode: switchMode,
    hasExistingRecords: Boolean(initialRecords),
  };

  return (
    <div className="space-y-3">
      {/* Holiday banner */}
      {isHoliday && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-3">
          <CalendarCheck2 className="h-5 w-5 mt-0.5 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold text-sm">
              Holiday: {holidayEvent?.title || "Non-Working Day"}
            </p>
            <p className="text-xs mt-0.5 text-amber-700">
              Student attendance cannot be recorded on a holiday.
            </p>
          </div>
        </div>
      )}

      {mode === "sequential" ? (
        <SequentialMarkingView {...sharedProps} />
      ) : (
        <AttendanceRoster {...sharedProps} markAll={markAll} />
      )}

      <SubmitConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={async () => {
          setShowConfirm(false);
          await submit();
        }}
        students={students}
        state={attendanceMap}
        initialState={initialRecords ? initialCodeMap : undefined}
        summary={summary}
        submitting={submitting}
        isUpdate={Boolean(initialRecords)}
        attendanceDate={attendanceDate}
        sectionName={sectionUuid}
      />
    </div>
  );
}
