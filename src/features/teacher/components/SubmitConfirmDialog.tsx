import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TeacherStudentResponseDto } from "@/services/types/teacher";
import type { LocalCode } from "./AttendanceRoster";

// ─────────────────────────────────────── types

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  students: TeacherStudentResponseDto[];
  /** Current attendance state (local codes: "P" | "A" | "L") */
  state: Record<string, LocalCode>;
  /** Initial local-code state before teacher made any changes this session */
  initialState?: Record<string, LocalCode>;
  summary: { P: number; A: number; L: number };
  submitting: boolean;
  isUpdate?: boolean;
  attendanceDate: string;
  sectionName?: string;
}

// ─────────────────────────────────────── helpers

function codeLabel(code: LocalCode) {
  return code === "P" ? "Present" : code === "A" ? "Absent" : "Late";
}

const CODE_COLOR: Record<LocalCode, string> = {
  P: "text-emerald-600",
  A: "text-red-600",
  L: "text-amber-600",
};

const CODE_ROW_BG: Record<LocalCode, string> = {
  P: "",
  A: "bg-red-50/50 dark:bg-red-950/10",
  L: "bg-amber-50/50 dark:bg-amber-950/10",
};

// ─────────────────────────────────────── component

export default function SubmitConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  students,
  state,
  initialState,
  summary,
  submitting,
  isUpdate,
  attendanceDate,
  sectionName,
}: Props) {
  const [verified, setVerified] = useState(false);

  // Reset verified checkbox whenever the dialog opens
  useEffect(() => {
    if (open) setVerified(false);
  }, [open]);

  const absentLate = students.filter((s) => {
    const code = state[s.uuid] ?? "P";
    return code === "A" || code === "L";
  });

  const changes = initialState
    ? students.filter((s) => (state[s.uuid] ?? "P") !== (initialState[s.uuid] ?? "P"))
    : [];

  const formattedDate = (() => {
    try {
      return new Date(`${attendanceDate}T12:00:00`).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return attendanceDate;
    }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Attendance Submission</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Context line */}
          <p className="text-sm text-muted-foreground">
            {sectionName && <span className="font-medium text-foreground">{sectionName}</span>}
            {sectionName && " · "}
            {formattedDate}
          </p>

          {/* P / A / L summary cards */}
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { code: "P" as LocalCode, label: "Present", cardBg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800", numCls: "text-emerald-600", lblCls: "text-emerald-700 dark:text-emerald-400" },
                { code: "A" as LocalCode, label: "Absent",  cardBg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",       numCls: "text-red-600",     lblCls: "text-red-700 dark:text-red-400" },
                { code: "L" as LocalCode, label: "Late",    cardBg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800", numCls: "text-amber-600",   lblCls: "text-amber-700 dark:text-amber-400" },
              ] as const
            ).map(({ code, label, cardBg, numCls, lblCls }) => (
              <div key={code} className={cn("rounded-xl border p-3 text-center", cardBg)}>
                <p className={cn("text-2xl font-bold tabular-nums", numCls)}>{summary[code]}</p>
                <p className={cn("text-xs font-medium", lblCls)}>{label}</p>
              </div>
            ))}
          </div>

          {/* Diff — shown only in update mode when something changed */}
          {isUpdate && changes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Changes ({changes.length})
              </p>
              <div className="rounded-lg border divide-y max-h-32 overflow-y-auto text-xs">
                {changes.map((s) => {
                  const from = initialState?.[s.uuid] ?? "P";
                  const to = state[s.uuid] ?? "P";
                  return (
                    <div key={s.uuid} className="flex items-center gap-2 px-3 py-1.5">
                      <span className="w-6 shrink-0 text-center font-mono text-muted-foreground">
                        {s.rollNumber}
                      </span>
                      <span className="flex-1 min-w-0 truncate font-medium">
                        {s.firstName} {s.lastName}
                      </span>
                      <span className={cn("font-semibold", CODE_COLOR[from])}>{codeLabel(from)}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className={cn("font-semibold", CODE_COLOR[to])}>{codeLabel(to)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Absent / Late list */}
          {absentLate.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Absent / Late ({absentLate.length})
              </p>
              <div className="rounded-lg border divide-y max-h-40 overflow-y-auto text-xs">
                {absentLate.map((s) => {
                  const code = state[s.uuid] ?? "A";
                  return (
                    <div
                      key={s.uuid}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5",
                        CODE_ROW_BG[code as LocalCode]
                      )}
                    >
                      <span className="w-6 shrink-0 text-center font-mono text-muted-foreground">
                        {s.rollNumber}
                      </span>
                      <span className="flex-1 min-w-0 truncate font-medium">
                        {s.firstName} {s.lastName}
                      </span>
                      <span className={cn("font-bold", CODE_COLOR[code as LocalCode])}>
                        {code}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Verify checkbox */}
          <label className="flex cursor-pointer items-start gap-2.5 group">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-primary"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
            />
            <span className="text-sm text-muted-foreground transition-colors group-hover:text-foreground">
              I have reviewed the attendance and confirm it is accurate.
            </span>
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Go Back
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!verified || submitting}
          >
            {submitting
              ? "Submitting…"
              : isUpdate
              ? "Update Attendance"
              : "Submit Attendance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
