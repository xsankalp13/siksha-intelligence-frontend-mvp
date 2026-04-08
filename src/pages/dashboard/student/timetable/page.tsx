import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useStudentTimetableContext } from '@/features/student/timetable/queries';
import { StudentTimetableGrid } from '@/features/student/timetable/components/StudentTimetableGrid';
import type { ScheduleSlot } from '@/features/student/timetable/components/StudentTimetableGrid';
import { LectureLogSheet } from '@/features/student/timetable/components/LectureLogSheet';
import {
  DISPLAY_DAYS,
  getWeekLabel,
  getDateForDay,
  getDayOfWeekNumber,
} from '@/features/student/timetable/utils/weekDates';

const SHORT_DAY: Record<string, string> = {
  MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed',
  THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat',
};

const MAX_WEEK_OFFSET = 4;

function TimetableSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-3 p-3.5 border border-border/30 rounded-xl bg-card">
          <Skeleton className="w-1 h-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StudentTimetablePage() {
  const { data: context, isLoading, isError, refetch, isFetching } = useStudentTimetableContext();

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0);

  // Day navigation — default to today's day
  const todayName = new Date()
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toUpperCase() as (typeof DISPLAY_DAYS)[number];
  const defaultDay = DISPLAY_DAYS.includes(todayName as any) ? todayName : 'MONDAY';
  const [selectedDay, setSelectedDay] = useState<string>(defaultDay);

  // Lecture log sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<ScheduleSlot | null>(null);

  const handleSlotClick = (slot: ScheduleSlot) => {
    setActiveSlot(slot);
    setSheetOpen(true);
  };

  // Count classes per day for the indicator dots
  const classCounts = useMemo(() => {
    if (!context) return {} as Record<string, number>;
    const schedByTimeslot = new Map(context.existingSchedule.map((e) => [e.timeslotId, e]));
    return Object.fromEntries(
      DISPLAY_DAYS.map((day) => {
        const dowNum = getDayOfWeekNumber(day);
        const count = context.timeslots.filter((ts) => {
          if (ts.dayOfWeek !== dowNum) return false;
          if (ts.isBreak || ts.isNonTeachingSlot) return false;
          return schedByTimeslot.has(ts.uuid);
        }).length;
        return [day, count];
      })
    );
  }, [context]);

  // Sheet slot info enriched with date
  const sheetSlotInfo = useMemo(() => {
    if (!activeSlot) return null;
    const date = getDateForDay(
      DOW_NUMBER_TO_NAME[activeSlot.timeslot.dayOfWeek] ?? selectedDay,
      weekOffset
    );
    return {
      scheduleUuid: activeSlot.scheduleUuid,
      subject: activeSlot.subject.name,
      teacher: activeSlot.teacher.name,
      room: activeSlot.room?.name ?? 'TBD',
      startTime: formatTime(activeSlot.timeslot.startTime),
      endTime: formatTime(activeSlot.timeslot.endTime),
      date,
      isBreak: activeSlot.isBreak,
    };
  }, [activeSlot, selectedDay, weekOffset]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-5">
          <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Timetable Unavailable</h2>
        <p className="text-muted-foreground mb-6 max-w-md text-sm">
          We couldn't load your timetable. This might be because your class schedule hasn't been published yet, or there's a connection issue.
        </p>
        <Button onClick={() => refetch()} size="lg">
          <RefreshCcw className="w-4 h-4 mr-2" /> Try Again
        </Button>
      </div>
    );
  }

  const sectionLabel = context
    ? `${context.section.className} — Section ${context.section.sectionName}`
    : 'Loading...';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-5 pb-12 pt-2"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Timetable</h1>
            <p className="text-sm text-muted-foreground">{sectionLabel}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching || isLoading}
          className="self-start sm:self-auto text-muted-foreground hover:text-foreground"
        >
          <RefreshCcw className={cn('w-3.5 h-3.5 mr-1.5', (isFetching || isLoading) && 'animate-spin')} />
          {(isFetching || isLoading) ? 'Syncing...' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left — day selector + week nav */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-4">
            {/* Week navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={weekOffset <= -MAX_WEEK_OFFSET}
                onClick={() => setWeekOffset((w) => w - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <p className="text-xs font-semibold text-foreground leading-none">
                  {weekOffset === 0 ? 'This Week' : weekOffset < 0 ? `${Math.abs(weekOffset)}w ago` : `+${weekOffset}w`}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{getWeekLabel(weekOffset)}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={weekOffset >= MAX_WEEK_OFFSET}
                onClick={() => setWeekOffset((w) => w + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {weekOffset !== 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-7"
                onClick={() => { setWeekOffset(0); setSelectedDay(defaultDay); }}
              >
                Back to This Week
              </Button>
            )}

            {/* Day buttons */}
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Select Day
              </p>
              {DISPLAY_DAYS.map((day) => {
                const date = getDateForDay(day, weekOffset);
                const isToday = date.toDateString() === new Date().toDateString();
                const isPast = date < new Date() && !isToday;
                const isSelected = selectedDay === day;
                const count = classCounts[day] ?? 0;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all duration-150',
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                        : isToday
                        ? 'bg-primary/10 text-primary font-medium hover:bg-primary/15'
                        : 'hover:bg-muted/60 text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span>{SHORT_DAY[day]}</span>
                      {isToday && !isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isPast && !isSelected && (
                        <span className="text-[10px] text-muted-foreground opacity-60">past</span>
                      )}
                      {count > 0 && (
                        <Badge
                          variant={isSelected ? 'secondary' : 'outline'}
                          className={cn(
                            'text-[10px] h-4 px-1.5 font-bold',
                            isSelected && 'bg-primary-foreground/20 text-primary-foreground border-transparent'
                          )}
                        >
                          {count}
                        </Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right — timeline */}
        <div className="lg:col-span-9">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm min-h-[400px]">
            {isLoading ? (
              <TimetableSkeleton />
            ) : context ? (
              <StudentTimetableGrid
                context={context}
                weekOffset={weekOffset}
                selectedDay={selectedDay}
                onSlotClick={handleSlotClick}
              />
            ) : null}

            {!isLoading && context && context.existingSchedule.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <CalendarDays className="w-12 h-12 mb-4 opacity-15" />
                <p className="font-semibold">Timetable Not Published Yet</p>
                <p className="text-sm mt-1">
                  Your class schedule hasn't been published. Check back soon.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lecture Log Sheet */}
      <LectureLogSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        slot={sheetSlotInfo}
      />
    </motion.div>
  );
}

// Helper — DOW number → name
const DOW_NUMBER_TO_NAME: Record<number, string> = {
  1: 'MONDAY', 2: 'TUESDAY', 3: 'WEDNESDAY',
  4: 'THURSDAY', 5: 'FRIDAY', 6: 'SATURDAY', 7: 'SUNDAY',
};

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}
