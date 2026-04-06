import { useEffect, useMemo, useState } from "react";
import { Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { SLOT_ICON_MAP, SLOT_STYLE_MAP } from "@/features/teacher/constants";
import type { TeacherScheduleEntry } from "@/services/types/teacher";

type Props = {
  entries: TeacherScheduleEntry[];
};

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export default function ScheduleTimeline({ entries }: Props) {
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const nowMinutes = useMemo(() => {
    const d = new Date(tick);
    return d.getHours() * 60 + d.getMinutes();
  }, [tick]);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => toMinutes(a.timeslot.startTime) - toMinutes(b.timeslot.startTime)),
    [entries]
  );

  const nextTeaching = sorted.find((e) => e.slotType === "TEACHING" && toMinutes(e.timeslot.startTime) > nowMinutes);

  return (
    <div className="space-y-3">
      {sorted.map((entry, idx) => {
        const Icon = SLOT_ICON_MAP[entry.slotType];
        const start = toMinutes(entry.timeslot.startTime);
        const end = toMinutes(entry.timeslot.endTime);
        const isNow = nowMinutes >= start && nowMinutes < end;
        const isPast = nowMinutes >= end;
        const minutesLeft = Math.max(0, end - nowMinutes);

        return (
          <div key={`${entry.timeslot.uuid}-${idx}`} className={cn("rounded-xl border p-4", SLOT_STYLE_MAP[entry.slotType], isPast && "opacity-55")}> 
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={cn("rounded-lg p-2", isNow ? "bg-blue-500/20 text-blue-700" : "bg-background/70 text-muted-foreground")}>
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {entry.timeslot.startTime} - {entry.timeslot.endTime}
                  </p>
                  <p className="text-sm text-foreground">
                    {entry.subject?.subjectName ?? (entry.slotType === "LEISURE" ? "Free Period" : entry.timeslot.slotLabel)}
                  </p>
                  {entry.clazz && entry.section ? (
                    <p className="text-xs text-muted-foreground">
                      {entry.clazz.className} - {entry.section.sectionName}
                    </p>
                  ) : null}
                </div>
              </div>
              {isNow ? <span className="rounded-full bg-blue-500/15 px-2 py-1 text-xs font-semibold text-blue-700">NOW · {minutesLeft}m left</span> : null}
            </div>
            {entry.room ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {entry.room.roomName} {entry.room.floor ? `(${entry.room.floor})` : ""}
              </p>
            ) : null}
            {nextTeaching && isNow && entry.slotType === "TEACHING" && entry.room?.roomName !== nextTeaching.room?.roomName && (toMinutes(nextTeaching.timeslot.startTime) - nowMinutes) <= 10 ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-blue-700">
                <Clock className="h-3.5 w-3.5" />
                Head to {nextTeaching.room?.roomName ?? "next room"} in {Math.max(0, toMinutes(nextTeaching.timeslot.startTime) - nowMinutes)} min
              </p>
            ) : null}
          </div>
        );
      })}
      {sorted.length === 0 ? <p className="text-sm text-muted-foreground">No schedule entries available.</p> : null}
    </div>
  );
}
