import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { SLOT_ICON_MAP, SLOT_STYLE_MAP } from "@/features/teacher/constants";
import type { TeacherScheduleEntry } from "@/services/types/teacher";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;
const DAY_LABELS: Record<string, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
  THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat",
};

type Props = {
  entries: TeacherScheduleEntry[];
};

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export default function WeekTimetableOverview({ entries }: Props) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  const byDay = useMemo(() => {
    const map: Record<string, TeacherScheduleEntry[]> = {};
    for (const d of DAYS) map[d] = [];
    for (const e of entries) {
      if (map[e.dayOfWeek]) map[e.dayOfWeek].push(e);
    }
    for (const d of DAYS) {
      map[d].sort((a, b) => toMinutes(a.timeslot.startTime) - toMinutes(b.timeslot.startTime));
    }
    return map;
  }, [entries]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {DAYS.map((day) => {
        const slots = byDay[day];
        const isToday = day === today;
        const teachingCount = slots.filter((s) => s.slotType === "TEACHING").length;
        const firstSlot = slots[0];
        const lastSlot = slots[slots.length - 1];

        return (
          <div
            key={day}
            className={cn(
              "rounded-xl border p-3 transition-all",
              isToday
                ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20"
                : "border-border bg-card hover:shadow-sm"
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className={cn("text-xs font-bold uppercase tracking-wider", isToday ? "text-primary" : "text-muted-foreground")}>
                {DAY_LABELS[day]}
              </span>
              {isToday && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                  TODAY
                </span>
              )}
            </div>

            {teachingCount > 0 ? (
              <p className="text-lg font-bold text-foreground">{teachingCount} <span className="text-xs font-normal text-muted-foreground">classes</span></p>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">Free day</p>
            )}

            {firstSlot && lastSlot && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {firstSlot.timeslot.startTime.slice(0, 5)} – {lastSlot.timeslot.endTime.slice(0, 5)}
              </p>
            )}

            <div className="mt-2 space-y-1">
              {slots.slice(0, 6).map((slot, idx) => {
                const Icon = SLOT_ICON_MAP[slot.slotType];
                const start = toMinutes(slot.timeslot.startTime);
                const end = toMinutes(slot.timeslot.endTime);
                const isNow = isToday && nowMinutes >= start && nowMinutes < end;

                return (
                  <div
                    key={`${slot.timeslot.uuid}-${idx}`}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[10px]",
                      SLOT_STYLE_MAP[slot.slotType],
                      isNow && "ring-1 ring-blue-500/40"
                    )}
                  >
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="truncate font-medium">
                      {slot.subject?.subjectName ?? (slot.slotType === "BREAK" ? "Break" : "Free")}
                    </span>
                  </div>
                );
              })}
              {slots.length > 6 && (
                <p className="text-center text-[10px] text-muted-foreground">+{slots.length - 6} more</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
