import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ScheduleTimeline from "@/features/teacher/components/ScheduleTimeline";
import WeekOverviewPanel from "@/features/teacher/components/WeekOverviewPanel";
import { useTeacherSchedule } from "@/features/teacher/queries/useTeacherQueries";
import type { TeacherScheduleEntry } from "@/services/types/teacher";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDayOfWeekName(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
}

export default function TeacherSchedulePage() {
  const reduce = useReducedMotion();
  const current = getDayOfWeekName();
  const [day, setDay] = useState(DAYS.includes(current) ? current : "MONDAY");
  const [showMonthView, setShowMonthView] = useState(false);

  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  const { data } = useTeacherSchedule();

  const entries = useMemo(
    () => (data?.entries ?? []).filter((entry: TeacherScheduleEntry) => entry.dayOfWeek === day),
    [data?.entries, day]
  );

  // Month calendar logic
  const calDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1; // Mon-start
    const cells: Array<{ date: number | null; dayOfWeek: string; isToday: boolean; teachingCount: number }> = [];

    // Fill empty cells before month start
    for (let i = 0; i < offset; i++) cells.push({ date: null, dayOfWeek: "", isToday: false, teachingCount: 0 });

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(calYear, calMonth, d);
      const dow = dateObj.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
      const isToday = dateObj.toDateString() === today.toDateString();
      const teachingCount = (data?.entries ?? []).filter(
        (e: TeacherScheduleEntry) => e.dayOfWeek === dow && e.slotType === "TEACHING"
      ).length;
      cells.push({ date: d, dayOfWeek: dow, isToday, teachingCount });
    }
    return cells;
  }, [calYear, calMonth, data?.entries, today]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={reduce ? {} : { opacity: 1, y: 0 }}
      className="mx-auto max-w-6xl space-y-5 pb-10"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Weekly Schedule</h1>
            <p className="text-sm text-muted-foreground">Select a day to view detailed timeline.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showMonthView ? "default" : "outline"}
            size="sm"
            onClick={() => setShowMonthView(!showMonthView)}
          >
            {showMonthView ? "Hide Calendar" : "Month View"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDay(DAYS.includes(current) ? current : "MONDAY")}
          >
            Today
          </Button>
        </div>
      </div>

      {/* Split-Panel Layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: Week Overview Panel */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">This Week</h3>
            <WeekOverviewPanel
              entries={data?.entries ?? []}
              selectedDay={day}
              onSelectDay={setDay}
            />
          </div>
        </div>

        {/* Right: Day Detail */}
        <div className="lg:col-span-9">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">
                {day.charAt(0) + day.slice(1).toLowerCase()}&apos;s Schedule
              </h3>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {entries.filter((e: TeacherScheduleEntry) => e.slotType === "TEACHING").length} classes
              </span>
            </div>
            <ScheduleTimeline entries={entries} />
          </div>
        </div>
      </div>

      {/* Month Calendar (Collapsible) */}
      {showMonthView && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-sm font-semibold">{MONTH_NAMES[calMonth]} {calYear}</h3>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="py-1 text-[10px] font-semibold text-muted-foreground">{d}</div>
            ))}
            {calDays.map((cell, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg py-1.5 text-xs transition-colors",
                  cell.date === null && "invisible",
                  cell.isToday && "bg-primary/10 font-bold ring-1 ring-primary/30",
                  cell.dayOfWeek === "SUNDAY" && "text-muted-foreground/40",
                  cell.dayOfWeek === "SATURDAY" && "text-muted-foreground/60"
                )}
              >
                {cell.date && (
                  <>
                    <span>{cell.date}</span>
                    {cell.teachingCount > 0 && (
                      <div className="mt-0.5 flex gap-0.5">
                        {Array.from({ length: Math.min(cell.teachingCount, 4) }).map((_, i) => (
                          <div key={i} className="h-1 w-1 rounded-full bg-primary" />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
