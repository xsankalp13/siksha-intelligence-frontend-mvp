import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { attendanceService } from "@/services/attendance";
import type { StudentAttendanceRequestDTO } from "@/services/types/attendance";
import type { TeacherStudentResponseDto } from "@/services/types/teacher";
import { useQuery } from "@tanstack/react-query";

type AttendanceCode = "P" | "A" | "L";

type Props = {
  students: TeacherStudentResponseDto[];
  sectionUuid: string;
  staffUuid: string;
  selectedDate?: string;
  initialRecords?: Record<string, string> | null;
  onSubmitSuccess?: () => void;
};

const order: AttendanceCode[] = ["P", "A", "L"];

const styleMap: Record<AttendanceCode, string> = {
  P: "ring-emerald-500/70",
  A: "ring-red-500/70",
  L: "ring-amber-500/70",
};

export default function QuickAttendanceGrid({ students, sectionUuid, staffUuid, selectedDate, initialRecords, onSubmitSuccess }: Props) {
  const [state, setState] = useState<Record<string, AttendanceCode>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showMarkAllConfirm, setShowMarkAllConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // If we receive initialRecords that has keys, it means attendance is already marked for this date.
  const isAlreadyMarked = useMemo(() => {
    return initialRecords != null && Object.keys(initialRecords).length > 0;
  }, [initialRecords]);

  const [isEditMode, setIsEditMode] = useState(!isAlreadyMarked);

  // Fetch backend attendance types to get exact shortcodes
  const { data: attendanceTypes, isFetching } = useQuery({
    queryKey: ["ams", "types"],
    queryFn: async () => {
      return (await attendanceService.getAllTypes()).data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const shortCodeMap = useMemo(() => {
    if (!attendanceTypes || attendanceTypes.length === 0) return null;

    const pCode = attendanceTypes.find((t) => t.presentMark)?.shortCode;
    const aCode = attendanceTypes.find((t) => t.absenceMark)?.shortCode;
    const lCode = attendanceTypes.find((t) => t.lateMark)?.shortCode;

    return { P: pCode ?? "P", A: aCode ?? "A", L: lCode ?? "L" };
  }, [attendanceTypes]);

  useEffect(() => {
    setIsEditMode(!isAlreadyMarked);
  }, [isAlreadyMarked]);

  useEffect(() => {
    const next: Record<string, AttendanceCode> = {};
    students.forEach((s) => {
      // If we have an initial backend record (like 'PR'), map it back to UI state 'P'.
      if (initialRecords && initialRecords[s.uuid]) {
        const backendCode = initialRecords[s.uuid];
        if (backendCode === shortCodeMap?.A) next[s.uuid] = "A";
        else if (backendCode === shortCodeMap?.L) next[s.uuid] = "L";
        else next[s.uuid] = "P";
      } else {
        next[s.uuid] = "P";
      }
    });
    setState(next);
  }, [students, sectionUuid, initialRecords, shortCodeMap]);

  const summary = useMemo(() => {
    const values = Object.values(state);
    return {
      P: values.filter((v) => v === "P").length,
      A: values.filter((v) => v === "A").length,
      L: values.filter((v) => v === "L").length,
    };
  }, [state]);

  const cycle = (uuid: string) => {
    setState((prev) => {
      const current = prev[uuid] ?? "P";
      const next = order[(order.indexOf(current) + 1) % order.length];
      return { ...prev, [uuid]: next };
    });
  };

  const markAllPresent = () => {
    setState((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        next[k] = "P";
      });
      return next;
    });
  };

  const submit = async () => {
    if (students.length === 0) return;
    setSubmitting(true);
    try {
      const today = selectedDate || new Date().toISOString().slice(0, 10);
      const takenBy = staffUuid.trim();

      if (!takenBy) {
        throw new Error("Unable to submit attendance: missing staff UUID. Please reload the page.");
      }

      const studentsWithoutUuid = students.filter((student) => !String(student.uuid ?? "").trim());

      if (studentsWithoutUuid.length > 0) {
        const names = studentsWithoutUuid
          .slice(0, 3)
          .map((student) => `${student.firstName} ${student.lastName}`.trim())
          .join(", ");
        const extraCount = studentsWithoutUuid.length > 3 ? ` +${studentsWithoutUuid.length - 3} more` : "";
        throw new Error(`Cannot submit attendance. Missing studentUuid for: ${names}${extraCount}.`);
      }

      if (!shortCodeMap) {
        throw new Error("Unable to submit attendance: Server configuration missing or loading. Please refresh the page.");
      }

      const payload: StudentAttendanceRequestDTO[] = students.map((student) => {
        const uicode = state[student.uuid] ?? "P";
        return {
          studentUuid: student.uuid,
          attendanceShortCode: shortCodeMap[uicode] ?? "P",
          attendanceDate: today,
          takenByStaffUuid: takenBy,
        };
      });

      await attendanceService.createStudentAttendanceBatch(payload);
      toast.success("Attendance submitted");
      onSubmitSuccess?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? error?.message ?? "Failed to submit attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const studentsToUpdateForMarkAll = useMemo(() => {
    return students
      .filter((student) => (state[student.uuid] ?? "P") !== "P")
      .map((student) => ({
        uuid: student.uuid,
        name: `${student.firstName} ${student.lastName}`.trim(),
        rollNumber: student.rollNumber,
        currentCode: state[student.uuid] ?? "P",
      }));
  }, [students, state]);

  const submitPreview = useMemo(() => {
    return students.map((student) => ({
      uuid: student.uuid,
      name: `${student.firstName} ${student.lastName}`.trim(),
      rollNumber: student.rollNumber,
      code: state[student.uuid] ?? "P",
    }));
  }, [students, state]);

  const markAllPreviewSummary = useMemo(() => {
    const total = students.length;
    return {
      P: total,
      A: 0,
      L: 0,
    };
  }, [students.length]);

  const handleMarkAllRequest = () => {
    if (students.length === 0) return;
    setShowMarkAllConfirm(true);
  };

  const handleConfirmMarkAll = () => {
    markAllPresent();
    setShowMarkAllConfirm(false);
    toast.success("All students marked present");
  };

  const handleSubmitRequest = () => {
    if (students.length === 0 || submitting) return;
    setShowSubmitConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setShowSubmitConfirm(false);
    await submit();
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {students.map((student) => (
          <button
            key={student.uuid}
            type="button"
            onClick={() => isEditMode && cycle(student.uuid)}
            className={`rounded-xl border border-border/60 p-2 text-left transition ${
              isEditMode ? "bg-background/60 hover:bg-accent/40" : "bg-card opacity-90 cursor-default"
            }`}
          >
            <div className="flex items-center gap-2">
              <UserAvatar name={`${student.firstName} ${student.lastName}`} profileUrl={student.profileUrl} className={`h-8 w-8 ring-2 ${styleMap[state[student.uuid] ?? "P"]}`} />
              <div>
                <p className="text-xs font-semibold text-foreground line-clamp-1">{student.firstName} {student.lastName}</p>
                <p className="text-[11px] text-muted-foreground">#{student.rollNumber}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {!isFetching && (!attendanceTypes || attendanceTypes.length === 0) && (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <p className="text-sm font-semibold text-red-500">
            Attendance types are not configured on the server. Please check with your administrator.
          </p>
        </div>
      )}

      {students.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Users className="mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No students found for this class. Check that students are enrolled in this section.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-4 w-4" /> {summary.P}</span>
          <span className="flex items-center gap-1 text-red-700"><XCircle className="h-4 w-4" /> {summary.A}</span>
          <span className="flex items-center gap-1 text-amber-700"><Clock3 className="h-4 w-4" /> {summary.L}</span>
        </div>
        <div className="flex gap-2">
          {isEditMode ? (
            <>
              <Button variant="outline" size="sm" onClick={handleMarkAllRequest}>Mark All Present</Button>
              <Button size="sm" onClick={handleSubmitRequest} disabled={submitting || !shortCodeMap}>{submitting ? "Submitting..." : "Submit Attendance"}</Button>
            </>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setIsEditMode(true)}>Edit Attendance</Button>
          )}
        </div>
      </div>

      <AlertDialog open={showMarkAllConfirm} onOpenChange={setShowMarkAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark all present?</AlertDialogTitle>
            <AlertDialogDescription>
              {studentsToUpdateForMarkAll.length > 0
                ? `This will update ${studentsToUpdateForMarkAll.length} student(s) to Present.`
                : "All students are already marked Present."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-56 overflow-y-auto rounded-md border border-border/60">
            <div className="divide-y divide-border/60">
              {(studentsToUpdateForMarkAll.length > 0 ? studentsToUpdateForMarkAll : submitPreview).map((student) => (
                <div key={student.uuid} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{student.name}</p>
                    <p className="text-xs text-muted-foreground">#{student.rollNumber}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {"currentCode" in student ? `${student.currentCode} -> P` : "P"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-emerald-700">{markAllPreviewSummary.P} Present</span>
            <span className="text-red-700">{markAllPreviewSummary.A} Absent</span>
            <span className="text-amber-700">{markAllPreviewSummary.L} Late</span>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMarkAll}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit attendance now?</AlertDialogTitle>
            <AlertDialogDescription>
              Please review student attendance before final submission for this section.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-56 overflow-y-auto rounded-md border border-border/60">
            <div className="divide-y divide-border/60">
              {submitPreview.map((student) => (
                <div key={student.uuid} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{student.name}</p>
                    <p className="text-xs text-muted-foreground">#{student.rollNumber}</p>
                  </div>
                  <span className="text-xs font-semibold">{student.code}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-emerald-700">{summary.P} Present</span>
            <span className="text-red-700">{summary.A} Absent</span>
            <span className="text-amber-700">{summary.L} Late</span>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
