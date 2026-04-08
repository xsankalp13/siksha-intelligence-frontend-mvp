import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, User, DoorOpen, ChevronRight } from 'lucide-react';
import { getDayOfWeekNumber, getDateForDay, formatShortDate } from '../utils/weekDates';
import type { EditorContextDto } from '@/features/academics/timetable_management/types';

function normalizeTime(time: string): string {
  const parts = time.split(':');
  return `${parts[0].padStart(2, '0')}:${(parts[1] || '00').padStart(2, '0')}`;
}

function formatDisplayTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export interface ScheduleSlot {
  scheduleUuid: string;
  subject: { uuid: string; name: string; subjectCode: string; color?: string };
  teacher: { id: string; name: string };
  room?: { uuid: string; name: string };
  timeslot: {
    uuid: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotLabel: string;
    isBreak: boolean;
    isNonTeachingSlot: boolean;
  };
  isBreak: boolean;
}

interface DayColumn {
  dayName: string;       // e.g. "MONDAY"
  dayLabel: string;      // e.g. "Mon"
  dateLabel: string;     // e.g. "Apr 7"
  date: Date;
  isToday: boolean;
  slots: ScheduleSlot[];
  breakSlots: { startTime: string; endTime: string; label: string }[];
}

interface StudentTimetableGridProps {
  context: EditorContextDto;
  weekOffset: number;
  selectedDay: string;
  onSlotClick: (slot: ScheduleSlot) => void;
}

const DISPLAY_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const SHORT_DAY: Record<string, string> = {
  MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed',
  THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat',
};

// Soft pastel colours derived from a hash of the subject code
function subjectColor(code: string, color?: string): string {
  if (color && color.startsWith('bg-')) return color;
  const palette = [
    'bg-blue-500/10 text-blue-700 border-blue-200',
    'bg-violet-500/10 text-violet-700 border-violet-200',
    'bg-emerald-500/10 text-emerald-700 border-emerald-200',
    'bg-amber-500/10 text-amber-700 border-amber-200',
    'bg-rose-500/10 text-rose-700 border-rose-200',
    'bg-cyan-500/10 text-cyan-700 border-cyan-200',
    'bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-200',
    'bg-teal-500/10 text-teal-700 border-teal-200',
  ];
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + (hash << 5) - hash;
  return palette[Math.abs(hash) % palette.length];
}

export function StudentTimetableGrid({
  context,
  weekOffset,
  selectedDay,
  onSlotClick,
}: StudentTimetableGridProps) {
  const today = new Date();
  const todayDow = today.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

  // Build a map: timeslotUuid → schedule entry (uuid + subject + teacher)
  type EntryRef = {
    uuid: string;
    subjectId: string;
    teacherId: string;
    roomId: string;
    timeslotId: string;
  };
  const scheduleByTimeslot = new Map<string, EntryRef>();
  context.existingSchedule.forEach((entry) => {
    scheduleByTimeslot.set(entry.timeslotId, entry);
  });

  // Build DayColumns for the selected day only (timeline view)
  const dayColumns: DayColumn[] = DISPLAY_DAYS.map((dayName) => {
    const dowNumber = getDayOfWeekNumber(dayName);
    const date = getDateForDay(dayName, weekOffset);
    const isToday = date.toDateString() === today.toDateString();

    // Timeslots for this day
    const dayTimeslots = context.timeslots.filter((ts) => ts.dayOfWeek === dowNumber);

    const slots: ScheduleSlot[] = [];
    const breakSlots: DayColumn['breakSlots'] = [];

    dayTimeslots.forEach((ts) => {
      const isBreakSlot =
        ts.isBreak ||
        ts.isNonTeachingSlot ||
        ts.slotLabel?.toLowerCase().includes('break') ||
        ts.slotLabel?.toLowerCase().includes('lunch') ||
        ts.slotLabel?.toLowerCase().includes('assembly');

      if (isBreakSlot) {
        breakSlots.push({
          startTime: normalizeTime(ts.startTime),
          endTime: normalizeTime(ts.endTime),
          label: ts.slotLabel || 'Break',
        });
        return;
      }

      const entry = scheduleByTimeslot.get(ts.uuid);
      if (!entry) return; // unscheduled timeslot

      const subject = context.availableSubjects.find((s) => s.uuid === entry.subjectId);
      const teacher = context.teachers.find((t) => t.id === entry.teacherId);
      if (!subject || !teacher) return;

      slots.push({
        scheduleUuid: entry.uuid,
        subject,
        teacher,
        timeslot: ts,
        isBreak: false,
      });
    });

    return {
      dayName,
      dayLabel: SHORT_DAY[dayName],
      dateLabel: formatShortDate(date),
      date,
      isToday,
      slots,
      breakSlots,
    };
  });

  const selectedColumn = dayColumns.find((c) => c.dayName === selectedDay) ?? dayColumns[0];

  // Build full timeline including breaks, sorted by startTime
  type TimelineItem =
    | { kind: 'slot'; slot: ScheduleSlot }
    | { kind: 'break'; label: string; startTime: string; endTime: string };

  const allTimeslots = context.timeslots
    .filter((ts) => ts.dayOfWeek === getDayOfWeekNumber(selectedDay))
    .sort((a, b) => normalizeTime(a.startTime).localeCompare(normalizeTime(b.startTime)));

  const timeline: TimelineItem[] = allTimeslots.map((ts) => {
    const isBreakSlot =
      ts.isBreak ||
      ts.isNonTeachingSlot ||
      ts.slotLabel?.toLowerCase().includes('break') ||
      ts.slotLabel?.toLowerCase().includes('lunch') ||
      ts.slotLabel?.toLowerCase().includes('assembly');

    if (isBreakSlot) {
      return {
        kind: 'break',
        label: ts.slotLabel || 'Break',
        startTime: normalizeTime(ts.startTime),
        endTime: normalizeTime(ts.endTime),
      };
    }

    const entry = scheduleByTimeslot.get(ts.uuid);
    if (!entry) {
      return {
        kind: 'break',
        label: 'Free Period',
        startTime: normalizeTime(ts.startTime),
        endTime: normalizeTime(ts.endTime),
      };
    }

    const subject = context.availableSubjects.find((s) => s.uuid === entry.subjectId);
    const teacher = context.teachers.find((t) => t.id === entry.teacherId);
    if (!subject || !teacher) {
      return {
        kind: 'break',
        label: 'Free Period',
        startTime: normalizeTime(ts.startTime),
        endTime: normalizeTime(ts.endTime),
      };
    }

    return {
      kind: 'slot',
      slot: {
        scheduleUuid: entry.uuid,
        subject,
        teacher,
        timeslot: ts,
        isBreak: false,
      },
    };
  });

  const now = new Date();
  const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  function getSlotStatus(item: TimelineItem): 'live' | 'done' | 'upcoming' | null {
    if (selectedColumn.dayName !== todayDow) {
      const isPast = selectedColumn.date < today && selectedColumn.date.toDateString() !== today.toDateString();
      return isPast ? 'done' : null;
    }
    const startTime = item.kind === 'slot' ? normalizeTime(item.slot.timeslot.startTime) : item.startTime;
    const endTime = item.kind === 'slot' ? normalizeTime(item.slot.timeslot.endTime) : item.endTime;
    if (nowTimeStr >= startTime && nowTimeStr < endTime) return 'live';
    if (nowTimeStr >= endTime) return 'done';
    return 'upcoming';
  }

  return (
    <div className="space-y-4">
      {/* Day header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground">
            {selectedColumn.dayLabel}
            <span className="text-muted-foreground font-normal text-base ml-2">
              {format(selectedColumn.date, 'EEEE, MMMM d')}
            </span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedColumn.slots.length} classes scheduled
          </p>
        </div>
        {selectedColumn.isToday && (
          <Badge className="bg-primary/10 text-primary border-primary/20">Today</Badge>
        )}
      </div>

      {/* Timeline */}
      {timeline.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <BookOpen className="w-10 h-10 mb-3 opacity-20" />
          <p>No classes scheduled for this day.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-muted ml-4 space-y-0">
          {timeline.map((item, idx) => {
            const status = getSlotStatus(item);
            const isLive = status === 'live';
            const isDone = status === 'done';

            if (item.kind === 'break') {
              return (
                <div key={idx} className="relative pl-6 py-3">
                  <div className="absolute -left-[5px] top-5 w-2.5 h-2.5 rounded-full bg-muted border-2 border-background" />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground/70 py-1 px-3 rounded-lg bg-muted/30 border border-dashed border-border/40 w-fit">
                    <span>{formatDisplayTime(item.startTime)}</span>
                    <span>—</span>
                    <span className="font-medium">{item.label}</span>
                    <span>—</span>
                    <span>{formatDisplayTime(item.endTime)}</span>
                  </div>
                </div>
              );
            }

            const { slot } = item;
            const colorClass = subjectColor(slot.subject.subjectCode, slot.subject.color);

            return (
              <div key={idx} className="relative pl-6 py-2">
                {/* Timeline dot */}
                <div className={cn(
                  "absolute -left-[9px] top-5 w-4 h-4 rounded-full border-2 border-background transition-all",
                  isLive ? "bg-primary ring-4 ring-primary/20 animate-pulse" : isDone ? "bg-muted-foreground/40" : "bg-muted"
                )} />

                {/* Card */}
                <button
                  onClick={() => onSlotClick(slot)}
                  className={cn(
                    "w-full text-left group flex items-stretch gap-3 p-3.5 rounded-xl border transition-all duration-200",
                    "hover:shadow-md hover:scale-[1.005] active:scale-[0.998]",
                    isLive
                      ? "border-primary/30 bg-primary/5 shadow-sm"
                      : isDone
                      ? "border-border/30 bg-muted/20 opacity-70"
                      : "border-border/50 bg-card hover:border-primary/30 hover:bg-muted/20"
                  )}
                >
                  {/* Left accent bar */}
                  <div className={cn("w-1 rounded-full shrink-0 transition-all", colorClass.split(' ')[0])} />

                  <div className="flex-1 min-w-0">
                    {/* Time */}
                    <div className="flex items-center justify-between mb-1.5">
                      <p className={cn(
                        "text-xs font-semibold",
                        isLive ? "text-primary" : "text-muted-foreground"
                      )}>
                        <Clock className="w-3 h-3 inline mr-1" />
                        {formatDisplayTime(normalizeTime(slot.timeslot.startTime))} — {formatDisplayTime(normalizeTime(slot.timeslot.endTime))}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {isLive && (
                          <Badge className="text-[10px] h-4.5 px-1.5 bg-primary/90 text-primary-foreground">LIVE</Badge>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                      </div>
                    </div>

                    {/* Subject */}
                    <h4 className="text-sm font-bold text-foreground tracking-tight leading-none mb-1.5">
                      {slot.subject.name}
                    </h4>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {slot.teacher.name}
                      </span>
                      {slot.room && (
                        <span className="flex items-center gap-1">
                          <DoorOpen className="w-3 h-3" />
                          {slot.room.name}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
