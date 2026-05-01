import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, isFuture } from "date-fns";
import { attendanceService } from "@/services/attendance";
import { hrmsService } from "@/services/hrms";
import { useTeacherSchedule } from "@/features/teacher/queries/useTeacherQueries";
import { ChevronLeft, ChevronRight, Clock, MapPin, Calendar as CalendarIcon, Fingerprint, Info, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { StaffAttendanceResponseDTO } from "@/services/types/attendance";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string; icon: typeof CheckCircle2 }> = {
  P: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", label: "Present", icon: CheckCircle2 },
  A: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", label: "Absent", icon: XCircle },
  L: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", label: "Late", icon: AlertTriangle },
  LV: { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-300", label: "On Leave", icon: Clock },
  HD: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", label: "Half Day", icon: Clock },
};

function getStatusStyle(code?: string) {
  if (!code) return null;
  return STATUS_STYLES[code] ?? null;
}

export default function StaffAttendanceCalendar() {
  const { data: schedule } = useTeacherSchedule();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRecord, setSelectedRecord] = useState<StaffAttendanceResponseDTO | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);

  const { data, isLoading } = useQuery({
    queryKey: ["ams", "staff", "my-attendance", format(monthStart, "yyyy-MM"), schedule?.staffUuid],
    queryFn: () =>
      attendanceService
        .listStaffAttendance({
          staffUuid: schedule?.staffUuid,
          fromDate: format(monthStart, "yyyy-MM-dd"),
          toDate: format(monthEnd, "yyyy-MM-dd"),
          size: 31,
        })
        .then((r) => r.data),
    enabled: Boolean(schedule?.staffUuid),
  });

  const recordsByDate = useMemo(() => {
    const map = new Map<string, StaffAttendanceResponseDTO>();
    (data?.content ?? []).forEach((row) => map.set(row.attendanceDate, row));
    return map;
  }, [data?.content]);

  // Derive the academic year (India: April–March cycle)
  const displayedMonth = currentDate.getMonth() + 1; // 1-12
  const displayedYear = currentDate.getFullYear();
  const academicYear = displayedMonth >= 4
    ? `${displayedYear}-${displayedYear + 1}`
    : `${displayedYear - 1}-${displayedYear}`;

  const { data: calendarEvents } = useQuery({
    queryKey: ["hrms", "calendar", "events", "month", format(monthStart, "yyyy-MM")],
    queryFn: () =>
      hrmsService
        .listCalendarEvents({
          month: displayedMonth,
          academicYear,
          fromDate: format(monthStart, "yyyy-MM-dd"),
          toDate: format(monthEnd, "yyyy-MM-dd"),
        })
        .then((r) => r.data),
  });

  const calendarMap = useMemo(() => {
    const map = new Map();
    (calendarEvents ?? []).forEach(e => {
      if (e.dayType === "HOLIDAY" || e.dayType === "VACATION") {
        map.set(e.date, e);
      }
    });
    return map;
  }, [calendarEvents]);

  // Calendar grid
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const prefixDays = Array.from({ length: startDayOfWeek }).map((_, i) => i);
  const totalSlots = prefixDays.length + daysInMonth.length;
  const suffixDays = Array.from({ length: Math.ceil(totalSlots / 7) * 7 - totalSlots }).map((_, i) => i);

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const timeDisplay = (time?: string) => (time ? time.slice(0, 5) : "--:--");

  // Monthly summary
  const summary = useMemo(() => {
    const all = data?.content ?? [];
    return {
      present: all.filter((r) => r.shortCode === "P").length,
      absent: all.filter((r) => r.shortCode === "A").length,
      late: all.filter((r) => r.shortCode === "L").length,
      leave: all.filter((r) => r.shortCode === "LV").length,
    };
  }, [data?.content]);

  return (
    <>
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5 text-foreground">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
              <CalendarIcon size={18} className="text-primary" />
            </div>
            <h3 className="text-lg font-bold tracking-tight">Attendance Calendar</h3>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h4 className="font-semibold w-36 text-center text-foreground">{format(currentDate, "MMMM yyyy")}</h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={nextMonth}
              disabled={isSameMonth(currentDate, new Date())}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-4 border-b border-border text-center divide-x divide-border">
          <div className="py-2.5 bg-emerald-50/70">
            <p className="text-lg font-bold text-emerald-600">{summary.present}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">Present</p>
          </div>
          <div className="py-2.5 bg-red-50/70">
            <p className="text-lg font-bold text-red-600">{summary.absent}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500">Absent</p>
          </div>
          <div className="py-2.5 bg-amber-50/70">
            <p className="text-lg font-bold text-amber-600">{summary.late}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-500">Late</p>
          </div>
          <div className="py-2.5 bg-violet-50/70">
            <p className="text-lg font-bold text-violet-600">{summary.leave}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-500">Leave</p>
          </div>
        </div>

        {/* Calendar body */}
        <div className="flex-1 p-4 md:p-6">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1.5">
            {DAYS_OF_WEEK.map((day, i) => (
              <div
                key={day}
                className={`text-center text-[9px] font-bold uppercase tracking-wide py-1 rounded-md ${
                  i === 0 ? "text-red-400" : "text-muted-foreground"
                }`}
              >
                {day.slice(0, 2)}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse flex flex-col items-center gap-2">
                <CalendarIcon size={32} className="text-muted opacity-30" />
                <p className="text-sm text-muted-foreground">Loading records...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {/* Prefix empty slots */}
              {prefixDays.map((i) => (
                <div key={`pre-${i}`} className="min-h-[56px] rounded-lg" />
              ))}

              {/* Day cells */}
              {daysInMonth.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const record = recordsByDate.get(dateKey);
                const isFut = isFuture(day) && !isToday(day);
                const isTod = isToday(day);
                const isSun = getDay(day) === 0;
                const holiday = calendarMap.get(dateKey);
                const style = getStatusStyle(record?.shortCode);

                return (
                  <button
                    key={dateKey}
                    onClick={() => record && setSelectedRecord(record)}
                    disabled={isFut || !record}
                    className={`min-h-[56px] p-1 flex flex-col items-center justify-between rounded-lg border transition-all duration-200 overflow-hidden
                      ${isFut
                        ? "bg-muted/20 border-transparent opacity-40 cursor-not-allowed"
                        : holiday
                          ? "bg-amber-50 cursor-default border-amber-200"
                          : style
                            ? `${style.bg} ${style.border} hover:shadow-md cursor-pointer hover:scale-[1.02]`
                            : isSun
                              ? "bg-red-50/30 border-red-100/50"
                              : "bg-muted/30 border-border/40 hover:bg-muted/50 cursor-default"
                      }
                      ${isTod ? "ring-2 ring-primary ring-offset-1" : ""}
                    `}
                  >
                    {/* Day number */}
                    <span
                      className={`text-xs font-bold flex h-6 w-6 items-center justify-center rounded-full shrink-0 ${
                        isTod
                          ? "bg-primary text-primary-foreground"
                          : holiday
                            ? "text-amber-600"
                            : isSun
                              ? "text-red-400"
                              : style
                                ? style.text
                                : "text-muted-foreground"
                      }`}
                    >
                      {format(day, "d")}
                    </span>

                    {/* Status label */}
                    {!isFut && (
                      <div className="mt-0.5 w-full flex justify-center">
                        {holiday ? (
                          <span className="text-[9px] text-amber-600 font-bold uppercase truncate max-w-full px-1" title={holiday.title}>
                            {holiday.title || "HOLIDAY"}
                          </span>
                        ) : style ? (
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${style.text}`}>
                            {style.label}
                          </span>
                        ) : !isSun ? (
                          <span className="text-[10px] text-muted-foreground/50 font-medium">—</span>
                        ) : (
                          <span className="text-[9px] text-red-300 font-semibold">OFF</span>
                        )}
                      </div>
                    )}

                    {/* Time-in badge */}
                    {record?.timeIn && (
                      <span className={`text-[9px] font-mono mt-0.5 flex items-center justify-center ${style?.text ?? "text-muted-foreground"}`}>
                        {record.timeIn.slice(0, 5)}
                        {record.earlyLeave && <AlertTriangle size={8} className="ml-1 text-rose-500" aria-label="Clocked out early" />}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Suffix empty slots */}
              {suffixDays.map((i) => (
                <div key={`suf-${i}`} className="min-h-[56px] rounded-lg" />
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-muted/30 border-t border-border/50 py-2.5 px-6 flex flex-wrap gap-4 text-xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-200 border border-emerald-300" /> Present</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-200 border border-red-300" /> Absent</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-200 border border-amber-300" /> Late</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-violet-200 border border-violet-300" /> Leave</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-orange-200 border border-orange-300" /> Half Day</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-100 border border-amber-200" /> Holiday</span>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={(o) => (!o ? setSelectedRecord(null) : null)}>
        <DialogContent className="sm:max-w-md">
          {selectedRecord && (() => {
            const style = getStatusStyle(selectedRecord.shortCode);
            const Icon = style?.icon ?? Clock;
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between mt-2">
                    <DialogTitle className="text-xl flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${style?.text ?? ""}`} />
                      {style?.label ?? selectedRecord.shortCode}
                    </DialogTitle>
                    {style && (
                      <Badge className={`${style.bg} ${style.text} ${style.border} font-bold`}>
                        {style.label}
                      </Badge>
                    )}
                  </div>
                  <DialogDescription>
                    {format(new Date(selectedRecord.attendanceDate), "EEEE, MMMM d, yyyy")}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-5 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                      <p className="text-xs text-emerald-600 uppercase tracking-wider font-bold mb-1 flex items-center">
                        <Clock size={12} className="mr-1" /> Time In
                      </p>
                      <p className="text-xl font-bold text-emerald-700">{timeDisplay(selectedRecord.timeIn)}</p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 relative">
                      {selectedRecord.earlyLeave && selectedRecord.earlyOutMinutes && (
                        <div className="absolute -top-2.5 -right-2.5 bg-rose-100 text-rose-700 border border-rose-200 shadow-sm text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center tracking-tight">
                          <AlertTriangle size={10} className="mr-1" />
                          Early -{Math.floor(selectedRecord.earlyOutMinutes / 60) > 0 ? `${Math.floor(selectedRecord.earlyOutMinutes / 60)}h ` : ""}{selectedRecord.earlyOutMinutes % 60 > 0 ? `${selectedRecord.earlyOutMinutes % 60}m` : ""}
                        </div>
                      )}
                      <p className="text-xs text-amber-600 uppercase tracking-wider font-bold mb-1 flex items-center">
                        <Clock size={12} className="mr-1" /> Time Out
                      </p>
                      <p className="text-xl font-bold text-amber-700">{timeDisplay(selectedRecord.timeOut)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2.5 border-b border-border/50">
                      <span className="text-sm font-medium text-muted-foreground flex items-center">
                        <Fingerprint size={14} className="mr-2" /> Source
                      </span>
                      <Badge variant="outline" className="font-mono text-xs">{selectedRecord.source}</Badge>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-border/50">
                      <span className="text-sm font-medium text-muted-foreground flex items-center">
                        <MapPin size={14} className="mr-2" /> Geo Verified
                      </span>
                      {selectedRecord.geoVerified ? (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </div>

                    {selectedRecord.notes && (
                      <div className="pt-2">
                        <span className="text-sm font-medium text-muted-foreground flex items-center mb-2">
                          <Info size={14} className="mr-2" /> Notes
                        </span>
                        <p className="text-sm bg-muted/40 p-3 rounded-lg border border-border/40 text-foreground">
                          {selectedRecord.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
