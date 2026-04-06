import { cn } from "@/lib/utils";
import type { TeacherScheduleEntry } from "@/services/types/teacher";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;
const DAY_SHORT: Record<string, string> = {
  MONDAY: "MON", TUESDAY: "TUE", WEDNESDAY: "WED",
  THURSDAY: "THU", FRIDAY: "FRI", SATURDAY: "SAT",
};

type Props = {
  entries: TeacherScheduleEntry[];
  selectedDay: string;
  onSelectDay: (day: string) => void;
};

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export default function WeekOverviewPanel({ entries, selectedDay, onSelectDay }: Props) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();

  const dayData = DAYS.map((day) => {
    const slots = entries
      .filter((e) => e.dayOfWeek === day)
      .sort((a, b) => toMinutes(a.timeslot.startTime) - toMinutes(b.timeslot.startTime));
    const teaching = slots.filter((s) => s.slotType === "TEACHING");
    const breaks = slots.filter((s) => s.slotType === "BREAK");
    const free = slots.filter((s) => s.slotType === "LEISURE");

    let totalTeachMin = 0;
    for (const s of teaching) {
      totalTeachMin += toMinutes(s.timeslot.endTime) - toMinutes(s.timeslot.startTime);
    }

    return { day, slots, teaching, breaks, free, totalTeachMin };
  });

  return (
    <div className="space-y-2">
      {dayData.map(({ day, teaching, breaks, free, totalTeachMin }) => {
        const isToday = day === today;
        const isSelected = day === selectedDay;

        return (
          <button
            key={day}
            onClick={() => onSelectDay(day)}
            className={cn(
              "w-full rounded-xl border p-3 text-left transition-all",
              isSelected
                ? "border-primary bg-primary/8 shadow-md ring-1 ring-primary/30"
                : isToday
                  ? "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/8"
                  : "border-border bg-card hover:bg-muted/40"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs font-bold",
                  isSelected ? "text-primary" : isToday ? "text-blue-600" : "text-muted-foreground"
                )}>
                  {DAY_SHORT[day]}
                </span>
                {isToday && (
                  <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[8px] font-bold text-white">
                    TODAY
                  </span>
                )}
              </div>
              <span className="text-sm font-bold text-foreground">
                {teaching.length}<span className="text-[10px] font-normal text-muted-foreground"> classes</span>
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>{Math.floor(totalTeachMin / 60)}h {totalTeachMin % 60}m teaching</span>
              {breaks.length > 0 && <span>· {breaks.length} breaks</span>}
              {free.length > 0 && <span>· {free.length} free</span>}
            </div>
            <div className="mt-1.5 flex gap-0.5">
              {Array.from({ length: Math.min(teaching.length, 8) }).map((_, i) => (
                <div key={`t-${i}`} className="h-1.5 w-3 rounded-full bg-primary/60" />
              ))}
              {Array.from({ length: Math.min(free.length, 4) }).map((_, i) => (
                <div key={`f-${i}`} className="h-1.5 w-3 rounded-full bg-muted-foreground/20" />
              ))}
              {Array.from({ length: Math.min(breaks.length, 3) }).map((_, i) => (
                <div key={`b-${i}`} className="h-1.5 w-3 rounded-full bg-amber-400/50" />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
