import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarX, ChevronLeft, ChevronRight, Clock, Sun } from "lucide-react";
import { format, endOfMonth, getDaysInMonth, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { attendanceService } from "@/services/attendance";
import { hrmsService } from "@/services/hrms";
import { useTeacherSchedule } from "@/features/teacher/queries/useTeacherQueries";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_COLOR: Record<string, string> = {
  P: "bg-emerald-500 text-white",
  A: "bg-red-500 text-white",
  L: "bg-amber-500 text-white",
  LV: "bg-violet-500 text-white",
  HD: "bg-orange-400 text-white",
  WEEKEND: "bg-muted text-muted-foreground",
  HOLIDAY: "bg-amber-100 text-amber-700",
};

const STATUS_DOT: Record<string, string> = {
  Present: "bg-emerald-500",
  Absent: "bg-red-500",
  Late: "bg-amber-500",
  Leave: "bg-violet-500",
  Holiday: "bg-amber-300",
  Weekend: "bg-muted-foreground/30",
};

// Helper: 24-hour HH:mm to percentage (0% to 100%)
const timeToPercent = (timeStr?: string) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return ((h * 60 + m) / 1440) * 100;
};

export default function TeacherMyAttendance({ staffUuid }: { staffUuid?: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1 to 12
  const { data: schedule } = useTeacherSchedule();
  
  const effectiveStaffUuid = staffUuid || schedule?.staffUuid;

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const formattedMonthStr = `${year}-${String(month).padStart(2, "0")}`;
  const firstDayStr = `${formattedMonthStr}-01`;
  const lastDayStr = format(endOfMonth(new Date(year, month - 1)), "yyyy-MM-dd");

  const { data, isLoading } = useQuery({
    queryKey: ["ams", "staff", "my-attendance", formattedMonthStr, effectiveStaffUuid],
    queryFn: () => attendanceService.listStaffAttendance({
      staffUuid: effectiveStaffUuid,
      fromDate: firstDayStr,
      toDate: lastDayStr,
      size: 31,
    }).then(r => r.data),
    enabled: !!effectiveStaffUuid
  });

  const academicYear = month >= 4
    ? `${year}-${year + 1}`
    : `${year - 1}-${year}`;

  const { data: calendarEvents } = useQuery({
    queryKey: ["hrms", "calendar", "events", "month", formattedMonthStr],
    queryFn: () => hrmsService.listCalendarEvents({
      month,
      academicYear,
      fromDate: firstDayStr,
      toDate: lastDayStr,
    }).then(r => r.data),
  });

  const holidayMap = useMemo(() => {
    const map = new Map<string, string>(); // date -> title
    (calendarEvents ?? []).forEach(e => {
      if (e.dayType === "HOLIDAY" || e.dayType === "VACATION") {
        map.set(e.date, e.title || "Holiday");
      }
    });
    return map;
  }, [calendarEvents]);

  // Derived arrays & stats
  const { stats, recordMap } = useMemo(() => {
    const map = new Map<number, any>();
    const all = data?.content ?? [];
    
    let p = 0, a = 0, l = 0, lv = 0;
    
    all.forEach(r => {
      const d = parseInt(r.attendanceDate.split("-")[2], 10);
      map.set(d, r);
      if (r.shortCode === "P") p++;
      else if (r.shortCode === "A") a++;
      else if (r.shortCode === "L") l++;
      else if (r.shortCode === "LV") lv++;
    });

    const total = p + a + l + lv;
    const pct = total === 0 ? 0 : ((p + l + lv) / total) * 100;

    return {
      stats: { totalDays: total, presentDays: p, absentDays: a, leaveDays: lv, lateDays: l, attendancePercentage: pct },
      recordMap: map
    };
  }, [data?.content]);

  // Calendar cells
  const calCells = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = getDaysInMonth(new Date(year, month - 1));
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    const cells: Array<{ day: number | null; status: string | null; isToday: boolean; holidayTitle?: string }> = [];
    for (let i = 0; i < offset; i++) cells.push({ day: null, status: null, isToday: false });

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d);
      const isToday = dateObj.toDateString() === now.toDateString();
      const dow = dateObj.getDay();
      const dateKey = `${formattedMonthStr}-${String(d).padStart(2, "0")}`;
      const holidayTitle = holidayMap.get(dateKey);
      
      const record = recordMap.get(d);
      let status = record?.shortCode ?? null;
      if (holidayTitle) status = "HOLIDAY";
      else if (!status && (dow === 0 || dow === 6)) status = "WEEKEND";
      
      cells.push({ day: d, status, isToday, holidayTitle });
    }
    return cells;
  }, [year, month, recordMap, now, holidayMap, formattedMonthStr]);

  const isEmpty = !data?.content?.length;

  return (
    <div className="space-y-6">
      {/* Month Navigator */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-base font-semibold">
          {MONTH_NAMES[month - 1]} {year}
        </h3>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <StatMini label="Recorded" value={stats.totalDays} loading={isLoading} />
        <StatMini label="Present" value={stats.presentDays} loading={isLoading} color="text-emerald-600" />
        <StatMini label="Late" value={stats.lateDays} loading={isLoading} color="text-amber-500" />
        <StatMini label="Absent" value={stats.absentDays} loading={isLoading} color="text-red-600" />
        <StatMini label="Leave" value={stats.leaveDays} loading={isLoading} color="text-violet-600" />
        <StatMini label="Score" value={`${stats.attendancePercentage.toFixed(1)}%`} loading={isLoading} color="text-primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 items-start">
        {/* Calendar Grid */}
        <Card className="h-fit">
          <CardHeader className="py-4">
            <CardTitle className="text-sm">Monthly Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            {isEmpty && !isLoading ? (
               <div className="py-8 text-center border rounded-lg bg-muted/10 border-dashed">
                <CalendarX className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No records</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} className="py-1 text-[10px] font-bold text-muted-foreground">{d}</div>
                  ))}
                  {calCells.map((cell, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex h-9 items-center justify-center rounded-md text-xs font-semibold transition-all relative group",
                        cell.day === null && "invisible",
                        cell.isToday && "ring-2 ring-primary ring-offset-1",
                        cell.status ? STATUS_COLOR[cell.status] ?? "bg-muted/50 text-foreground" : "bg-muted/30 text-muted-foreground border border-border/50"
                      )}
                      title={cell.holidayTitle}
                    >
                      {cell.day}
                      {cell.holidayTitle && (
                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500 border border-white" />
                      )}
                    </div>
                  ))}
                </div>
                {/* Legend */}
                <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-muted-foreground font-medium justify-center">
                  {Object.entries(STATUS_DOT).map(([status, color]) => (
                    <span key={status} className="flex items-center gap-1.5 uppercase tracking-wider">
                      <span className={cn("inline-block h-2 w-2 rounded-full", color)} />
                      {status}
                    </span>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* TruTime Timeline View */}
        <Card className="flex flex-col h-fit">
          <CardHeader className="py-4 border-b border-border/50 bg-muted/5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock size={16} className="text-primary" /> Shift Timeline (TruTime)
            </CardTitle>
            <CardDescription className="text-xs">
              Daily comparative view of required shift bounds vs actual recorded punches.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden">
            {isLoading ? (
               <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading timeline...</div>
            ) : isEmpty ? (
              <div className="p-12 text-center text-muted-foreground">
                 <p className="text-sm font-medium">No timeline records to display.</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border/40 max-h-[290px] overflow-y-auto custom-scrollbar">
                <div className="relative h-6 bg-muted/30 border-b border-border/50 text-[10px] font-mono text-muted-foreground flex items-center sticky top-0 z-10">
                  <div className="w-[80px] pl-4">Date</div>
                  <div className="flex-1 relative h-full">
                     {/* Scale markers */}
                     {[0, 6, 12, 18, 24].map(h => (
                       <div key={h} className="absolute top-1 transform -translate-x-1/2" style={{ left: `${(h/24)*100}%` }}>
                         {h.toString().padStart(2, '0')}:00
                       </div>
                     ))}
                  </div>
                  <div className="w-[100px] text-right pr-4">Details</div>
                </div>

                {(() => {
                  // Merge attendance records + holiday rows, sorted by date
                  const rows: Array<{ type: "record" | "holiday"; date: string; record?: any; holidayTitle?: string }> = [];

                  (data?.content ?? []).forEach(r => {
                    rows.push({ type: "record", date: r.attendanceDate, record: r });
                  });

                  holidayMap.forEach((title, date) => {
                    // Only include if not already covered by an attendance record for that date
                    const alreadyCovered = (data?.content ?? []).some(r => r.attendanceDate === date);
                    if (!alreadyCovered) rows.push({ type: "holiday", date, holidayTitle: title });
                  });

                  rows.sort((a, b) => a.date.localeCompare(b.date));

                  return rows.map((row, idx) => {
                    if (row.type === "holiday") {
                      const dayNum = row.date.split("-")[2];
                      return (
                        <div key={`hol-${row.date}`} className="flex items-center p-2 py-3 bg-amber-50/60 border-l-2 border-amber-400">
                          <div className="w-[80px] pl-2 flex flex-col justify-center">
                            <span className="text-xs font-bold text-foreground">
                              {dayNum} {MONTH_NAMES[month - 1].slice(0, 3)}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 text-amber-600">Holiday</span>
                          </div>
                          <div className="flex-1 relative h-10 mx-2 overflow-hidden rounded bg-amber-50 border border-amber-200 flex items-center justify-center">
                            <Sun size={13} className="text-amber-500 mr-1.5" />
                            <span className="text-[11px] font-semibold text-amber-700 truncate">{row.holidayTitle}</span>
                          </div>
                          <div className="w-[100px] text-right pr-2">
                            <span className="text-[10px] text-amber-600 font-semibold italic">Non-working</span>
                          </div>
                        </div>
                      );
                    }

                    const record = row.record;
                    const dayNum = record.attendanceDate.split("-")[2];
                  // Calculate positioning for shift constraint (Background Bar)
                  const shiftStartPct = record.shiftStartTime ? timeToPercent(record.shiftStartTime) : 37.5; // Default 09:00
                  const shiftEndPct = record.shiftEndTime ? timeToPercent(record.shiftEndTime) : 75; // Default 18:00
                  let shiftWidth = shiftEndPct - shiftStartPct;
                  if (shiftWidth < 0) shiftWidth += 100; // overnight shift handling roughly

                  // Calculate positioning for actual logged time (Foreground Bar)
                  const actualStartPct = record.timeIn ? timeToPercent(record.timeIn) : 0;
                  const actualEndPct = record.timeOut ? timeToPercent(record.timeOut) : timeToPercent(new Date().toTimeString().slice(0, 5));
                  
                  let actualWidth = 0;
                  if (record.timeIn) {
                      actualWidth = record.timeOut ? actualEndPct - actualStartPct : timeToPercent(new Date().toTimeString().slice(0, 5)) - actualStartPct;
                      if (actualWidth < 0) actualWidth += 100;
                  }

                  const isLeave = record.shortCode === "LV";
                  const isAbsent = record.shortCode === "A";

                  return (
                    <div key={idx} className="flex items-center group relative p-2 py-3 hover:bg-muted/10 transition-colors">
                      {/* Date Column */}
                      <div className="w-[80px] pl-2 flex flex-col justify-center">
                        <span className="text-xs font-bold text-foreground">
                           {dayNum} {MONTH_NAMES[month - 1].slice(0, 3)}
                        </span>
                        <span className={cn("text-[9px] font-bold uppercase tracking-wider mt-0.5", 
                          record.shortCode === 'P' ? "text-emerald-500" :
                          record.shortCode === 'L' ? "text-amber-500" :
                          record.shortCode === 'LV' ? "text-violet-500" : "text-red-500"
                        )}>
                          {record.shortCode === 'LV' ? 'Leave' : record.attendanceMark}
                        </span>
                      </div>

                      {/* Timeline Graph Column */}
                      <div className="flex-1 relative h-10 bg-background/50 border border-transparent mx-2 overflow-hidden rounded">
                         <div className="absolute inset-0 opacity-10" style={{ background: "repeating-linear-gradient(90deg, transparent, transparent 4.16%, currentColor 4.16%, currentColor 4.2%)", color: "hsl(var(--muted-foreground))" }} />
                         
                         {!isLeave && !isAbsent && (
                           <>
                             {/* Shift Bounds (Grey block) */}
                             <div 
                               className="absolute top-1 bottom-1 bg-muted border border-border/50 rounded-sm opacity-60"
                               style={{ left: `${shiftStartPct}%`, width: `${shiftWidth}%` }}
                               title={`Shift: ${record.shiftStartTime?.slice(0,5)} - ${record.shiftEndTime?.slice(0,5)}`}
                             />
                             
                             {/* Actual Hours (Colored block) */}
                             {record.timeIn && (
                               <div 
                                 className={cn("absolute top-2 bottom-2 rounded-sm shadow-sm opacity-90 transition-all", 
                                  record.shortCode === 'L' ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-emerald-400 to-emerald-500"
                                 )}
                                 style={{ left: `${actualStartPct}%`, width: `${actualWidth}%` }}
                               >
                                  {/* Just a tiny indicator if they forgot to clock out */}
                                  {!record.timeOut && <div className="absolute right-0 top-0 bottom-0 w-1 bg-amber-500 animate-pulse" />}
                               </div>
                             )}
                           </>
                         )}

                         {/* Full block visualization for Leave / Absent */}
                         {isLeave && (
                           <div className="absolute top-2 bottom-2 bg-violet-200 border-violet-400 border border-dashed rounded-md flex items-center justify-center opacity-80" style={{ left: `${shiftStartPct}%`, width: `${shiftWidth}%` }}>
                             <span className="text-[10px] font-bold text-violet-700 uppercase tracking-widest">{record.notes?.includes("Leave") ? "Approved Leave" : "Leave"}</span>
                           </div>
                         )}
                         {isAbsent && (
                           <div className="absolute top-3 bottom-3 bg-red-100 border-red-300 border border-dashed rounded flex items-center justify-center" style={{ left: `${shiftStartPct}%`, width: `${shiftWidth}%` }}>
                             <span className="text-[9px] font-bold text-red-500/80 uppercase">No Punch</span>
                           </div>
                         )}
                      </div>

                      {/* Detail Column */}
                      <div className="w-[100px] text-right pr-2 flex flex-col justify-center">
                        {!isLeave && !isAbsent ? (
                          <>
                            <div className="text-xs font-mono font-medium text-foreground">
                              {record.timeIn ? record.timeIn.slice(0, 5) : "--:--"} 
                              <span className="text-muted-foreground mx-1">→</span> 
                              {record.timeOut ? record.timeOut.slice(0, 5) : "--:--"}
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                               {record.totalHours ? `${record.totalHours.toFixed(1)} hrs` : "-"}
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] font-medium text-muted-foreground italic">—</div>
                        )}
                      </div>
                    </div>
                  );
                  }); // end rows.map
                })()}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

function StatMini({ label, value, loading, color }: { label: string; value: number | string; loading: boolean; color?: string; }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm flex flex-col items-center justify-center h-full">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className={cn("text-2xl font-bold tracking-tight", color ?? "text-foreground")}>
        {loading ? <span className="animate-pulse">…</span> : value}
      </p>
    </div>
  );
}
