import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, XCircle, Clock, Users, Search, Layers, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TeacherStudentResponseDto } from "@/services/types/teacher";

export type LocalCode = "P" | "A" | "L";

/** Returns Tailwind color classes based on attendance % thresholds */
function attPctColor(pct: number | undefined | null) {
  if (pct == null) return "text-muted-foreground bg-muted";
  if (pct >= 90) return "text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40";
  if (pct >= 75) return "text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/40";
  return "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-950/40";
}

interface AttendanceRosterProps {
  students: TeacherStudentResponseDto[];
  /** External controlled state — owned by parent */
  state: Record<string, LocalCode>;
  mark: (uuid: string, code: LocalCode) => void;
  markAll: (code: LocalCode) => void;
  summary: { P: number; A: number; L: number };
  onSubmit: () => Promise<void>;
  submitting: boolean;
  isHoliday?: boolean;
  onSwitchMode: () => void;
  hasExistingRecords?: boolean;
}

const STATUS_CONFIG = {
  P: {
    label: "Present",
    activeBtn: "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30 shadow-md",
    inactiveBtn: "bg-transparent text-muted-foreground border-border hover:border-emerald-400 hover:text-emerald-600",
    dot: "bg-emerald-500",
    ring: "ring-2 ring-emerald-400",
    rowBg: "bg-emerald-500/[0.04] hover:bg-emerald-500/10",
    filterActive: "bg-emerald-500 text-white border-emerald-500",
    filterInactive: "bg-transparent border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-600",
    icon: CheckCircle2,
  },
  A: {
    label: "Absent",
    activeBtn: "bg-red-500 text-white border-red-500 hover:bg-red-600 shadow-red-500/30 shadow-md",
    inactiveBtn: "bg-transparent text-muted-foreground border-border hover:border-red-400 hover:text-red-600",
    dot: "bg-red-500",
    ring: "ring-2 ring-red-400",
    rowBg: "bg-red-500/[0.05] hover:bg-red-500/10",
    filterActive: "bg-red-500 text-white border-red-500",
    filterInactive: "bg-transparent border-border text-muted-foreground hover:border-red-400 hover:text-red-600",
    icon: XCircle,
  },
  L: {
    label: "Late",
    activeBtn: "bg-amber-500 text-white border-amber-500 hover:bg-amber-600 shadow-amber-500/30 shadow-md",
    inactiveBtn: "bg-transparent text-muted-foreground border-border hover:border-amber-400 hover:text-amber-600",
    dot: "bg-amber-500",
    ring: "ring-2 ring-amber-400",
    rowBg: "bg-amber-500/[0.05] hover:bg-amber-500/10",
    filterActive: "bg-amber-500 text-white border-amber-500",
    filterInactive: "bg-transparent border-border text-muted-foreground hover:border-amber-400 hover:text-amber-600",
    icon: Clock,
  },
} as const;

export default function AttendanceRoster({
  students,
  state,
  mark,
  markAll,
  summary,
  onSubmit,
  submitting,
  isHoliday = false,
  onSwitchMode,
  hasExistingRecords,
}: AttendanceRosterProps) {
  // Local UI state only — search, filter, keyboard focus
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LocalCode | "ALL">("ALL");
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [lastMarkedIdx, setLastMarkedIdx] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) => {
      const matchQ =
        !q ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        String(s.rollNumber).includes(q);
      const matchF = filter === "ALL" || state[s.uuid] === filter;
      return matchQ && matchF;
    });
  }, [students, search, filter, state]);

  // Reset focus when filter/search changes
  useEffect(() => {
    setFocusedIdx(-1);
  }, [search, filter]);

  // Scroll focused row into view
  useEffect(() => {
    if (focusedIdx >= 0 && rowRefs.current[focusedIdx]) {
      rowRefs.current[focusedIdx]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [focusedIdx]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const len = filteredStudents.length;
      const advance = () =>
        setFocusedIdx((p) => Math.min(p + 1, len - 1));

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIdx((p) => Math.min(p + 1, len - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIdx((p) => Math.max(p - 1, 0));
      } else if (
        focusedIdx >= 0 &&
        focusedIdx < len &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        const uuid = filteredStudents[focusedIdx].uuid;
        if (e.key === "p" || e.key === "P") {
          e.preventDefault();
          mark(uuid, "P");
          advance();
        } else if (e.key === "a" || e.key === "A") {
          e.preventDefault();
          mark(uuid, "A");
          advance();
        } else if (e.key === "l" || e.key === "L") {
          e.preventDefault();
          mark(uuid, "L");
          advance();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [focusedIdx, filteredStudents, mark]);

  const presentPct =
    students.length > 0 ? (summary.P / students.length) * 100 : 0;
  const absentPct =
    students.length > 0 ? (summary.A / students.length) * 100 : 0;
  const latePct =
    students.length > 0 ? (summary.L / students.length) * 100 : 0;

  // Section average attendance % from historical data on student objects
  const sectionAvgPct = useMemo(() => {
    const withPct = students.filter((s) => s.attendancePercentage != null);
    if (withPct.length === 0) return null;
    return withPct.reduce((sum, s) => sum + (s.attendancePercentage ?? 0), 0) / withPct.length;
  }, [students]);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="bg-card px-5 py-4 border-b border-border space-y-3">
        {/* Row 1: title + mode switch + status filter pills */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">Attendance Roster</h2>
            <Badge variant="outline" className="gap-1 text-xs px-2 py-0.5">
              <Users className="h-3 w-3" />
              {students.length} students
            </Badge>
            {sectionAvgPct != null && (
              <Badge variant="outline" className={cn("gap-1 text-xs px-2 py-0.5", attPctColor(sectionAvgPct))}>
                <TrendingUp className="h-3 w-3" />
                Avg {sectionAvgPct.toFixed(1)}%
              </Badge>
            )}
            {/* Mode switch — desktop */}
            <button
              onClick={onSwitchMode}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2.5 rounded-lg border border-border hover:bg-muted"
            >
              <Layers className="h-3.5 w-3.5" />
              Sequential Mode
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {(["P", "A", "L"] as LocalCode[]).map((c) => {
              const cfg = STATUS_CONFIG[c];
              const Icon = cfg.icon;
              const active = filter === c;
              return (
                <button
                  key={c}
                  onClick={() => setFilter(active ? "ALL" : c)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all select-none",
                    active ? cfg.filterActive : cfg.filterInactive
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {summary[c]} {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: search + bulk mark */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or roll number…"
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="flex gap-1 shrink-0">
            {(["P", "A", "L"] as LocalCode[]).map((c) => (
              <Button
                key={c}
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs font-semibold"
                onClick={() => markAll(c)}
                disabled={isHoliday}
                title={`Mark all ${STATUS_CONFIG[c].label}`}
              >
                All {c}
              </Button>
            ))}
          </div>
        </div>

        {/* Row 3: progress bar (multi-segment) */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>
              {filter !== "ALL"
                ? `Filtered: ${filteredStudents.length} of ${students.length}`
                : `${students.length} total`}
            </span>
            <span>{presentPct.toFixed(0)}% present today</span>
          </div>
          <div className="flex h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${presentPct}%` }}
            />
            <div
              className="h-full bg-amber-400 transition-all duration-500"
              style={{ width: `${latePct}%` }}
            />
            <div
              className="h-full bg-red-500 transition-all duration-500"
              style={{ width: `${absentPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Keyboard-mode hint bar ─────────────────────────── */}
      {focusedIdx >= 0 && (
        <div className="px-5 py-1.5 bg-muted/40 border-b border-border flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="font-medium">Keyboard active — row {focusedIdx + 1}:</span>
          {(
            [
              { key: "P", label: "Present" },
              { key: "A", label: "Absent" },
              { key: "L", label: "Late" },
              { key: "↑↓", label: "Navigate" },
            ] as const
          ).map(({ key, label }) => (
            <span key={key} className="flex items-center gap-1">
              <kbd className="font-mono bg-background border border-border rounded px-1 py-px">
                {key}
              </kbd>
              <span>{label}</span>
            </span>
          ))}
        </div>
      )}

      {/* ── Student rows ───────────────────────────────────── */}
      <div className="max-h-[58vh] overflow-y-auto" ref={listRef}>
        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Search className="h-7 w-7 opacity-40" />
            <p className="text-sm">No students match your search</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredStudents.map((student, idx) => {
              const code = state[student.uuid] ?? "P";
              const isFocused = idx === focusedIdx;
              const isLastMarked = idx === lastMarkedIdx;
              const initials =
                `${student.firstName?.[0] ?? ""}${
                  student.lastName?.[0] ?? ""
                }`.toUpperCase();

              return (
                <div
                  key={student.uuid}
                  ref={(el) => {
                    rowRefs.current[idx] = el;
                  }}
                  onClick={() => setFocusedIdx(idx)}
                  className={cn(
                    "flex items-center gap-3 px-5 py-2.5 cursor-default select-none transition-colors border-l-2",
                    isFocused
                      ? "bg-primary/5 border-l-primary"
                      : isLastMarked
                      ? "border-l-muted-foreground/40 animate-pulse-once"
                      : [
                          "border-l-transparent",
                          STATUS_CONFIG[code].rowBg,
                        ]
                  )}
                >
                  {/* Roll # */}
                  <span className="w-8 shrink-0 text-center text-xs font-bold font-mono text-foreground/70">
                    {student.rollNumber ?? idx + 1}
                  </span>

                  {/* Avatar with status ring */}
                  <div
                    className={cn(
                      "relative h-8 w-8 shrink-0 rounded-full overflow-visible",
                    )}
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center",
                        STATUS_CONFIG[code].ring
                      )}
                    >
                      {student.profileUrl ? (
                        <img
                          src={student.profileUrl}
                          alt={initials}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-primary/70">
                          {initials}
                        </span>
                      )}
                    </div>
                    {/* Status dot */}
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                        STATUS_CONFIG[code].dot
                      )}
                    />
                  </div>

                  {/* Name */}
                  <p className="flex-1 min-w-0 text-sm font-medium truncate">
                    {student.firstName} {student.lastName}
                  </p>

                  {/* Attendance % pill */}
                  {student.attendancePercentage != null && (
                    <span
                      className={cn(
                        "hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                        attPctColor(student.attendancePercentage)
                      )}
                    >
                      {student.attendancePercentage.toFixed(0)}%
                    </span>
                  )}

                  {/* P | A | L buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {(["P", "A", "L"] as LocalCode[]).map((c) => {
                      const isActive = code === c;
                      return (
                        <button
                          key={c}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isHoliday) {
                              mark(student.uuid, c);
                              setLastMarkedIdx(idx);
                              // Auto-advance to next unfiltered row
                              if (idx + 1 < filteredStudents.length) {
                                setFocusedIdx(idx + 1);
                              }
                            }
                          }}
                          title={STATUS_CONFIG[c].label}
                          className={cn(
                            "h-7 w-7 rounded-md border text-xs font-bold transition-all duration-150",
                            isActive
                              ? STATUS_CONFIG[c].activeBtn
                              : STATUS_CONFIG[c].inactiveBtn
                          )}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────── */}
      <div className="border-t border-border bg-card px-5 py-3 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {isHoliday ? (
            <span className="font-medium text-amber-600">
              Holiday — attendance is locked
            </span>
          ) : (
            <>
              <span className="font-semibold text-emerald-600">
                {summary.P}
              </span>{" "}
              Present{" · "}
              <span className="font-semibold text-red-500">{summary.A}</span>{" "}
              Absent{" · "}
              <span className="font-semibold text-amber-500">{summary.L}</span>{" "}
              Late
            </>
          )}
        </p>
        <Button
          onClick={onSubmit}
          disabled={submitting || isHoliday || students.length === 0}
          className="min-w-[170px]"
        >
          {submitting
            ? "Submitting…"
            : hasExistingRecords
            ? "Update Attendance"
            : "Submit Attendance"}
        </Button>
      </div>
    </div>
  );
}
