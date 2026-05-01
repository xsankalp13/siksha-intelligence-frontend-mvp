import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  AlignJustify,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TeacherStudentResponseDto } from "@/services/types/teacher";
import type { LocalCode } from "./AttendanceRoster";

// ── Config ────────────────────────────────────────────────────────────
const CONF = {
  P: {
    label: "Present",
    bg: "bg-emerald-500",
    text: "text-white",
    inactiveBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  A: {
    label: "Absent",
    bg: "bg-red-500",
    text: "text-white",
    inactiveBg: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    icon: XCircle,
  },
  L: {
    label: "Late",
    bg: "bg-amber-500",
    text: "text-white",
    inactiveBg: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    icon: Clock,
  },
} as const;

const cardVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "65%" : "-65%",
    opacity: 0,
    scale: 0.96,
  }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? "-65%" : "65%",
    opacity: 0,
    scale: 0.96,
  }),
};

// ── Props ─────────────────────────────────────────────────────────────
interface Props {
  students: TeacherStudentResponseDto[];
  state: Record<string, LocalCode>;
  mark: (uuid: string, code: LocalCode) => void;
  summary: { P: number; A: number; L: number };
  onSubmit: () => Promise<void>;
  submitting: boolean;
  isHoliday?: boolean;
  onSwitchMode: () => void;
  hasExistingRecords?: boolean;
}

type LastAction = { idx: number; previousCode: LocalCode };


// ── Main component ───────────────────────────────────────────────────
export default function SequentialMarkingView({
  students,
  state,
  mark,
  summary,
  onSubmit,
  submitting,
  isHoliday = false,
  onSwitchMode,
  hasExistingRecords,
}: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [direction, setDirection] = useState(1);
  const [undoStack, setUndoStack] = useState<LastAction[]>([]);
  const [done, setDone] = useState(false);
  const [_showJump, _setShowJump] = useState(false);
  const [_jumpSearch, _setJumpSearch] = useState("");

  const total = students.length;
  const student = students[currentIdx];
  const markedCode: LocalCode = student ? (state[student.uuid] ?? "P") : "P";
  const progress = total > 0 ? (currentIdx / total) * 100 : 0;
  const initials = student
    ? `${student.firstName?.[0] ?? ""}${student.lastName?.[0] ?? ""}`.toUpperCase()
    : "";

  const handleMark = (code: LocalCode) => {
    if (!student || isHoliday) return;
    setUndoStack((prev) => [...prev, { idx: currentIdx, previousCode: state[student.uuid] ?? "P" }]);
    mark(student.uuid, code);
    setDirection(1);
    if (currentIdx + 1 >= total) {
      setDone(true);
    } else {
      setCurrentIdx((p) => p + 1);
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const action = undoStack[undoStack.length - 1];
    mark(students[action.idx].uuid, action.previousCode);
    setDirection(-1);
    setCurrentIdx(action.idx);
    setUndoStack((prev) => prev.slice(0, -1));
    setDone(false);
  };


  // ── Summary / Done screen ─────────────────────────────────────────
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-10 text-center space-y-6 min-h-[calc(100dvh-200px)]">
        {/* Icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-2xl font-bold">All Students Marked!</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Review the summary below before submitting.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
          {(["P", "A", "L"] as LocalCode[]).map((c) => (
            <div
              key={c}
              className={cn(
                "rounded-2xl p-4 text-center border",
                c === "P"
                  ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                  : c === "A"
                  ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
                  : "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
              )}
            >
              <p
                className={cn(
                  "text-3xl font-extrabold",
                  c === "P"
                    ? "text-emerald-600"
                    : c === "A"
                    ? "text-red-500"
                    : "text-amber-500"
                )}
              >
                {summary[c]}
              </p>
              <p className="text-xs mt-0.5 text-muted-foreground font-medium">
                {CONF[c].label}
              </p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="w-full max-w-[280px] space-y-2.5">
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className="w-full h-12 text-base font-semibold"
          >
            {submitting
              ? "Submitting…"
              : hasExistingRecords
              ? "Update Attendance"
              : "Submit Attendance"}
          </Button>
          <Button
            variant="outline"
            onClick={onSwitchMode}
            className="w-full h-10"
          >
            <AlignJustify className="h-4 w-4 mr-2" />
            Review in Roster
          </Button>
          {undoStack.length > 0 && (
            <button
              onClick={handleUndo}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Undo last mark
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Sequential marking screen ─────────────────────────────────────
  return (
    <div className="flex flex-col min-h-[calc(100dvh-200px)]">
      {/* ── Top bar ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 pt-2.5 pb-2.5 border-b border-border/60 bg-card shrink-0">
        {/* Roster switch button */}
        <button
          onClick={onSwitchMode}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 py-1 px-2 rounded-lg hover:bg-muted"
        >
          <AlignJustify className="h-3.5 w-3.5" />
          <span>Roster</span>
        </button>

        {/* Progress bar */}
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-mono text-muted-foreground shrink-0">
            {currentIdx}/{total}
          </span>
        </div>

        {/* Mini summary */}
        <div className="flex items-center gap-2 text-xs font-bold shrink-0">
          <span className="text-emerald-600">{summary.P}P</span>
          <span className="text-red-500">{summary.A}A</span>
          <span className="text-amber-500">{summary.L}L</span>
        </div>
      </div>

      {/* ── Card area ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-5 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIdx}
            custom={direction}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-sm"
          >
            <div className="rounded-2xl border border-border bg-card shadow-md overflow-hidden">
              {/* Photo zone */}
              <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden">
                {student?.profileUrl ? (
                  <img
                    src={student.profileUrl}
                    alt={initials}
                    className="h-full w-full object-cover object-top"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : null}
                {/* Initials fallback */}
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5",
                    student?.profileUrl ? "opacity-0" : "opacity-100"
                  )}
                >
                  <span className="text-7xl font-bold text-primary/30">
                    {initials}
                  </span>
                </div>

                {/* Roll pill — bottom-left */}
                <div className="absolute bottom-3 left-3">
                  <span className="bg-black/55 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    #{student?.rollNumber}
                  </span>
                </div>

                {/* Current status badge — top-right */}
                <div
                  className={cn(
                    "absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-bold transition-colors duration-200",
                    CONF[markedCode].bg,
                    CONF[markedCode].text
                  )}
                >
                  {CONF[markedCode].label}
                </div>
              </div>

              {/* Student info */}
              <div className="px-5 py-4">
                <p className="text-xl font-bold leading-tight">
                  {student?.firstName} {student?.lastName}
                </p>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                  <span>
                    {student?.className}-{student?.sectionName}
                  </span>
                  {student?.attendancePercentage !== undefined && (
                    <>
                      <span>·</span>
                      <span
                        className={cn(
                          "font-semibold",
                          student.attendancePercentage < 75
                            ? "text-red-500"
                            : student.attendancePercentage < 85
                            ? "text-amber-500"
                            : "text-emerald-600"
                        )}
                      >
                        {student.attendancePercentage.toFixed(0)}% this year
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Action buttons ─────────────────────────────────────── */}
      <div className="shrink-0 px-4 pb-6 pt-1 space-y-2.5">
        <div className="grid grid-cols-3 gap-3">
          {(["P", "A", "L"] as LocalCode[]).map((code) => {
            const cfg = CONF[code];
            const Icon = cfg.icon;
            const isActive = markedCode === code;
            return (
              <button
                key={code}
                onClick={() => handleMark(code)}
                disabled={isHoliday}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-2xl py-5 font-bold transition-all duration-150 active:scale-[0.97] select-none disabled:opacity-40",
                  isActive
                    ? `${cfg.bg} ${cfg.text} shadow-xl`
                    : "bg-muted/80 text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon
                  className="h-7 w-7"
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
                <span className="text-sm tracking-wide">{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Undo */}
        <button
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <RotateCcw className="h-4 w-4" />
          {undoStack.length > 0 ? `Undo (${undoStack.length})` : "Undo last mark"}
        </button>
      </div>
    </div>
  );
}
