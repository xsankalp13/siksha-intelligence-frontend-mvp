import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Printer, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { settingsService } from "@/features/super-admin/services/superAdminService";
import type { CalendarEventResponseDTO, DayType } from "@/services/types/hrms";
import { format } from "date-fns";

/* ── Constants ──────────────────────────────────────────────────────── */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// We will use standard color names for print, but solid colors via Tailwind for headers
const MONTH_COLORS = [
  "bg-cyan-600",     // Jan
  "bg-pink-500",     // Feb
  "bg-red-500",      // Mar
  "bg-emerald-600",  // Apr
  "bg-amber-500",    // May
  "bg-sky-600",      // Jun
  "bg-teal-600",     // Jul
  "bg-green-600",    // Aug
  "bg-orange-500",   // Sep
  "bg-rose-500",     // Oct
  "bg-violet-600",   // Nov
  "bg-blue-600",     // Dec
];

const DAY_STYLES: Record<DayType, { bg: string; border: string; text: string; label: string; printBg: string; dot: string }> = {
  HOLIDAY:             { bg: "bg-red-100 dark:bg-red-900/30",         border: "border-red-300 dark:border-red-800",       text: "text-red-900 dark:text-red-100",           label: "Government / General Holiday", printBg: "#fee2e2", dot: "bg-red-500" },
  HALF_DAY:            { bg: "bg-amber-100 dark:bg-amber-900/30",      border: "border-amber-300 dark:border-amber-800",   text: "text-amber-900 dark:text-amber-100",       label: "Half Day",                   printBg: "#fef3c7", dot: "bg-amber-500" },
  RESTRICTED_HOLIDAY:  { bg: "bg-orange-100 dark:bg-orange-900/30",    border: "border-orange-300 dark:border-orange-800", text: "text-orange-900 dark:text-orange-100",     label: "Restricted Holiday",        printBg: "#ffedd5", dot: "bg-orange-500" },
  VACATION:            { bg: "bg-cyan-100 dark:bg-cyan-900/30",        border: "border-cyan-300 dark:border-cyan-800",     text: "text-cyan-900 dark:text-cyan-100",         label: "Vacation",                    printBg: "#cffafe", dot: "bg-cyan-500" },
  EXAM_DAY:            { bg: "bg-fuchsia-100 dark:bg-fuchsia-900/30",  border: "border-fuchsia-300 dark:border-fuchsia-800",text: "text-fuchsia-900 dark:text-fuchsia-100",  label: "Exam Day",                printBg: "#fae8ff", dot: "bg-fuchsia-500" },
  WORKING:             { bg: "",                                        border: "",                                          text: "",                                         label: "Working Day",                 printBg: "#ffffff", dot: "" },
};

/* ── Helpers ─────────────────────────────────────────────────────────── */

export interface CalendarCell {
  day: number;
  month: number; // 0-11
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSunday: boolean;
  events: CalendarEventResponseDTO[];
  dateStr: string; // YYYY-MM-DD
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDow(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function buildMonthGrid(year: number, month: number, eventsByDate: Map<string, CalendarEventResponseDTO[]>): CalendarCell[][] {
  const totalDays = getDaysInMonth(year, month);
  const firstDow = getFirstDow(year, month);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const cells: CalendarCell[] = [];

  // Previous month fill
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevDays = getDaysInMonth(prevYear, prevMonth);
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = prevDays - i;
    const key = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({
      day: d, month: prevMonth, year: prevYear, isCurrentMonth: false, isToday: false,
      isSunday: cells.length % 7 === 0, events: eventsByDate.get(key) ?? [], dateStr: key
    });
  }

  // Current month
  for (let d = 1; d <= totalDays; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({
      day: d, month, year, isCurrentMonth: true, isToday: key === todayStr,
      isSunday: cells.length % 7 === 0, events: eventsByDate.get(key) ?? [], dateStr: key
    });
  }

  // Next month fill
  const remainder = cells.length % 7;
  if (remainder > 0) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    for (let d = 1; d <= 7 - remainder; d++) {
      const key = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        day: d, month: nextMonth, year: nextYear, isCurrentMonth: false, isToday: false,
        isSunday: cells.length % 7 === 0, events: eventsByDate.get(key) ?? [], dateStr: key
      });
    }
  }

  // Split into weeks
  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/* ── Print Helper ────────────────────────────────────────────────────── */

function generateYearPrintHtml(
  startYear: number,
  endYear: number,
  monthGrids: { year: number; month: number; grid: CalendarCell[][] }[],
  eventsByDate: Map<string, CalendarEventResponseDTO[]>,
  schoolName?: string,
  logoUrl?: string,
): string {
   const legendItems = Object.entries(DAY_STYLES)
    .filter(([key]) => key !== "WORKING")
    .map(
      ([, style]) => `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:14px;">
        <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${style.printBg};border:1px solid #d1d5db;"></span>
        <span style="font-size:10px;">${style.label}</span>
      </span>`,
    )
    .join("");

    const renderMonth = (mInfo: { year: number; month: number; grid: CalendarCell[][] }): string => {
        const rows = mInfo.grid.map((week) => `<tr>${week.map((cell) => {
            const key = cell.dateStr;
            const events = eventsByDate.get(key) ?? [];
            const primary = events.find((e) => e.dayType !== "WORKING");
            const bg = primary
              ? DAY_STYLES[primary.dayType]?.printBg ?? "#ffffff"
              : cell.isSunday && cell.isCurrentMonth
                ? "#fff1f2" // lightly red tinted sunday
                : "#ffffff";
            const opacity = cell.isCurrentMonth ? "1" : "0.28";
            const fontWeight = cell.isToday ? "700" : "400";
            return `<td style="width:14.28%;border:1px solid #e5e7eb;text-align:center;padding:5px 0;font-size:11px;background:${bg};opacity:${opacity};font-weight:${fontWeight};">${cell.day}</td>`;
          }).join("")}</tr>`).join("");
    
        return `<section class="month-card">
          <div class="month-head">
            <span>${MONTH_NAMES[mInfo.month]} ${mInfo.year}</span>
          </div>
          <table>
            <thead><tr>${DOW.map((d) => `<th style="${d==='Sun'?'color:#ef4444':''}">${d}</th>`).join("")}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`;
    };

    const monthsGrid = monthGrids.map(renderMonth).join("");

    return `<!DOCTYPE html>
    <html><head>
    <title>${startYear}-${endYear} Academic Calendar</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; color: #0f172a; }
      .page { min-height: 100%; }
      .header { margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between;}
      .brand-row { display: flex; align-items: center; gap: 12px; }
      .header h1 { font-size: 20px; line-height: 1.2; }
      .logo { width: 42px; height: 42px; object-fit: contain; border-radius: 4px; }
      .school-name { font-size: 22px; font-weight: 700; color: #1e293b; }
      .legend { margin: 6px 0 12px; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 8px 0; }
      .months { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
      .month-card { border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; break-inside: avoid; }
      .month-head { padding: 6px 8px; background: #0f172a; color: #f8fafc; text-align: center; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;}
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      th { background: #f8fafc; border: 1px solid #e2e8f0; font-size: 9px; padding: 4px 0; color: #475569; text-transform: uppercase; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
    </head><body>
      <div class="page">
        <div class="header">
          <div class="brand-row">
            ${logoUrl ? `<img src="${logoUrl}" alt="School logo" class="logo" />` : ""}
            ${schoolName ? `<p class="school-name">${schoolName}</p>` : ""}
          </div>
          <h1>Academic Calendar ${startYear} - ${endYear}</h1>
        </div>
        <div class="legend">${legendItems}</div>
        <div class="months">${monthsGrid}</div>
      </div>
      <script>window.onload = function() { window.print(); }</script>
    </body></html>`;
}

/* ── Component ───────────────────────────────────────────────────────── */

interface CalendarYearViewProps {
  startYear: number;
  endYear: number;
  events: CalendarEventResponseDTO[];
  onAddEvent?: (date: string) => void;
  onEditEvent?: (event: CalendarEventResponseDTO) => void;
  onDeleteEvent?: (event: CalendarEventResponseDTO) => void;
}

export default function CalendarYearView({ startYear, endYear, events, onAddEvent, onEditEvent, onDeleteEvent }: CalendarYearViewProps) {
  const printRef = useRef<Window | null>(null);
  const [activeMonthDetails, setActiveMonthDetails] = useState<{ year: number, month: number, grid: CalendarCell[][] } | null>(null);

  const { data: whiteLabel } = useQuery({
    queryKey: ["settings", "whitelabel"],
    queryFn: () => settingsService.getWhiteLabel().then((res) => res.data),
  });

  // Build event lookup map: "YYYY-MM-DD" -> events[]
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventResponseDTO[]>();
    for (const event of events) {
      const key = event.date;
      const existing = map.get(key);
      if (existing) existing.push(event);
      else map.set(key, [event]);
    }
    return map;
  }, [events]);

  // Order: April to Dec of startYear, Jan to March of endYear
  const monthSequence = useMemo(() => {
     const seq: { year: number, month: number }[] = [];
     for(let m = 3; m <= 11; m++) seq.push({ year: startYear, month: m }); // Apr-Dec (0-indexed 3-11)
     for(let m = 0; m <= 2; m++) seq.push({ year: endYear, month: m });    // Jan-Mar (0-indexed 0-2)
     return seq;
  }, [startYear, endYear]);

  const monthGrids = useMemo(() => {
     return monthSequence.map(seq => ({
         ...seq,
         grid: buildMonthGrid(seq.year, seq.month, eventsByDate)
     }));
  }, [monthSequence, eventsByDate]);

  const handlePrintYear = useCallback(() => {
    const html = generateYearPrintHtml(
      startYear,
      endYear,
      monthGrids,
      eventsByDate,
      whiteLabel?.schoolName,
      whiteLabel?.logoUrl,
    );
    const win = window.open("", "_blank");
    if (!win) return;
    printRef.current = win;
    win.document.write(html);
    win.document.close();
  }, [startYear, endYear, monthGrids, eventsByDate, whiteLabel?.schoolName, whiteLabel?.logoUrl]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
         <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background px-3 py-1.5 shadow-sm">
            {Object.entries(DAY_STYLES).filter(([key]) => key !== "WORKING").map(([key, style]) => (
                <span key={key} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${style.dot}`} />
                  <span className="text-[11px] font-medium text-muted-foreground mr-2">{style.label}</span>
                </span>
            ))}
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className="inline-block h-2.5 w-2.5 rounded border border-red-200 bg-red-50 dark:bg-red-900/20" />
                <span className="text-[11px] font-medium text-muted-foreground">Sunday</span>
            </span>
         </div>
         <Button variant="outline" size="sm" onClick={handlePrintYear}>
            <Printer className="mr-2 h-4 w-4" /> Print Academic Calendar
         </Button>
      </div>

      <div className="h-[calc(100vh-250px)] min-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 pb-10">
           {monthGrids.map((mInfo, idx) => (
              <MonthCard
                key={idx}
                year={mInfo.year}
                month={mInfo.month}
                grid={mInfo.grid}
                onHeaderClick={() => setActiveMonthDetails(mInfo)}
                onAddEvent={onAddEvent}
                onEditEvent={onEditEvent}
                onDeleteEvent={onDeleteEvent}
              />
           ))}
         </div>
      </div>

      <Dialog open={Boolean(activeMonthDetails)} onOpenChange={(o) => { if (!o) setActiveMonthDetails(null); }}>
          <DialogContent className="max-w-4xl p-6">
              {activeMonthDetails && (
                 <>
                   <DialogHeader className="mb-4">
                     <DialogTitle className="text-2xl">{MONTH_NAMES[activeMonthDetails.month]} {activeMonthDetails.year}</DialogTitle>
                   </DialogHeader>
                   <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8">
                       {/* Expanded Calendar View */}
                       <div className="border rounded-xl overflow-hidden shadow-sm">
                          <div className={`p-3 text-center text-white font-semibold text-lg tracking-wide ${MONTH_COLORS[activeMonthDetails.month]}`}>
                             {MONTH_NAMES[activeMonthDetails.month]} {activeMonthDetails.year}
                          </div>
                          <div className="grid grid-cols-7 border-b bg-muted/30">
                            {DOW.map((d) => (
                              <div key={d} className={`py-3 text-center text-xs font-semibold uppercase tracking-wider ${d === "Sun" ? "text-red-500" : "text-muted-foreground"}`}>
                                {d}
                              </div>
                            ))}
                          </div>
                          <div className="p-1">
                            {activeMonthDetails.grid.map((week, wi) => (
                              <div key={wi} className="grid grid-cols-7">
                                {week.map((cell, di) => (
                                  <ExpandedDayCell 
                                      key={`${wi}-${di}`} 
                                      cell={cell} 
                                      onAddEvent={onAddEvent}
                                      onEditEvent={onEditEvent}
                                      onDeleteEvent={onDeleteEvent}
                                  />
                                ))}
                              </div>
                            ))}
                          </div>
                       </div>

                       {/* Events List for this month */}
                       <div className="space-y-4">
                          <h3 className="font-semibold border-b pb-2">Events & Holidays this Month</h3>
                          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                             {activeMonthDetails.grid.flat().filter(c => c.isCurrentMonth && c.events.some(e => e.dayType !== "WORKING")).flatMap(c => c.events.filter(e => e.dayType !== "WORKING")).map((event, idx) => (
                                <div key={idx} className="p-3 border rounded-lg bg-card shadow-sm space-y-2">
                                   <div className="flex justify-between items-start">
                                      <span className="font-medium text-sm">{event.title || event.dayType.replace(/_/g, " ")}</span>
                                      <span className="text-xs text-muted-foreground">{format(new Date(event.date), "MMM d")}</span>
                                   </div>
                                   <div className="flex items-center gap-2">
                                      <span className={`inline-block w-2.5 h-2.5 rounded-full ${DAY_STYLES[event.dayType].dot}`} />
                                      <span className="text-xs text-muted-foreground">{DAY_STYLES[event.dayType].label}</span>
                                   </div>
                                </div>
                             ))}
                             {activeMonthDetails.grid.flat().filter(c => c.isCurrentMonth && c.events.some(e => e.dayType !== "WORKING")).length === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-10 border border-dashed rounded-lg">No events recorded this month.</div>
                             )}
                          </div>
                       </div>
                   </div>
                 </>
              )}
          </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Month Card ──────────────────────────────────────────────────────── */

interface MonthCardProps {
  year: number;
  month: number;
  grid: CalendarCell[][];
  onHeaderClick: () => void;
  onAddEvent?: (date: string) => void;
  onEditEvent?: (event: CalendarEventResponseDTO) => void;
  onDeleteEvent?: (event: CalendarEventResponseDTO) => void;
}

function MonthCard({ year, month, grid, onHeaderClick, onAddEvent, onEditEvent, onDeleteEvent }: MonthCardProps) {
  const bgColorClass = MONTH_COLORS[month];

  return (
    <div className="group overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md h-full flex flex-col">
      {/* SOLID Color Month Header */}
      <div 
        className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-opacity hover:opacity-90 ${bgColorClass}`}
        onClick={onHeaderClick}
        title="Click to expand month details"
      >
        <span className="text-sm font-semibold text-white tracking-wide">{MONTH_NAMES[month]} {year}</span>
        <div className="flex gap-1">
           {grid.flat().filter(c => c.isCurrentMonth && c.events.some(e=>e.dayType === "HOLIDAY")).length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" title="Holidays in this month" />}
        </div>
      </div>

      <div className="grid grid-cols-7 border-b bg-muted/20">
        {DOW.map((d) => (
          <div key={d} className={`py-1 text-center text-[10px] font-bold uppercase tracking-wider ${d === "Sun" ? "text-red-500" : "text-muted-foreground"}`}>
            {d}
          </div>
        ))}
      </div>

      <div className="flex-1 p-[2px] bg-background">
        {grid.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-[2px]">
            {week.map((cell, di) => (
              <InteractiveDayCell key={`${wi}-${di}`} cell={cell} onAddEvent={onAddEvent} onEditEvent={onEditEvent} onDeleteEvent={onDeleteEvent} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Day Cell (Interactive Popover) ──────────────────────────────────── */

interface DayCellProps {
  cell: CalendarCell;
  onAddEvent?: (date: string) => void;
  onEditEvent?: (event: CalendarEventResponseDTO) => void;
  onDeleteEvent?: (event: CalendarEventResponseDTO) => void;
}

function InteractiveDayCell({ cell, onAddEvent, onEditEvent, onDeleteEvent }: DayCellProps) {
  const [open, setOpen] = useState(false);
  const primaryEvent = cell.events.find((e) => e.dayType !== "WORKING");
  const style = primaryEvent ? DAY_STYLES[primaryEvent.dayType] : null;

  const base = "relative flex flex-col pt-1 items-center justify-start rounded-md transition-all min-h-[46px] w-full border border-transparent";
  const opacity = cell.isCurrentMonth ? "" : "opacity-30";
  const todayStyles = cell.isToday ? "ring-2 ring-primary ring-inset shadow-inner font-bold text-primary animate-pulse shadow-[inset_0_0_8px_rgba(37,99,235,0.2)]" : "font-medium text-slate-700 dark:text-slate-200";
  const sundayStyle = cell.isSunday && cell.isCurrentMonth && !style ? "bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-300" : "";
  const eventBg = style ? `${style.bg} ${style.border}` : "hover:bg-slate-100 dark:hover:bg-slate-800";
  const cursor = cell.isCurrentMonth ? "cursor-pointer" : "cursor-default pointer-events-none";

  const content = (
    <div className={`${base} ${opacity} ${todayStyles} ${sundayStyle} ${eventBg} ${cursor} group/cell`}>
      <span className="text-[11px] leading-tight z-10">{cell.day}</span>
      
      {/* Event Dots Container */}
      <div className="absolute bottom-1 w-full flex justify-center gap-[2px] flex-wrap px-0.5">
          {cell.events.filter(e => e.dayType !== "WORKING").map((e, idx) => (
             <span key={idx} className={`w-1.5 h-1.5 rounded-full ${DAY_STYLES[e.dayType].dot}`} />
          ))}
      </div>
    </div>
  );

  if (!cell.isCurrentMonth) return content;

  return (
    <Popover open={open} onOpenChange={setOpen}>
       <PopoverTrigger asChild>{content}</PopoverTrigger>
       <PopoverContent className="w-64 p-3 shadow-xl border-border" align="center" side="top" sideOffset={5}>
          <div className="space-y-3">
             <div className="flex justify-between items-center border-b pb-2">
                <span className="font-semibold text-sm">{format(new Date(cell.dateStr), "PPPP")}</span>
             </div>

             {cell.events.length > 0 ? (
                <div className="space-y-2">
                   {cell.events.map(e => (
                      <div key={e.eventId} className="bg-muted p-2 rounded-md space-y-1 group relative pr-8">
                         <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${DAY_STYLES[e.dayType].dot}`} />
                            <span className="text-xs font-semibold leading-tight">{e.title || e.dayType.replace(/_/g, " ")}</span>
                         </div>
                         <div className="text-[10px] text-muted-foreground ml-3.5">
                            {e.appliesToStaff && e.appliesToStudents ? "Applies to All" : e.appliesToStaff ? "Applies to Staff" : "Applies to Students"}
                         </div>

                         {/* Quick actions wrapper */}
                         <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onEditEvent && (
                               <Button variant="ghost" size="icon" className="w-5 h-5 hover:bg-white text-muted-foreground hover:text-primary" onClick={() => { setOpen(false); onEditEvent(e); }}>
                                  <Edit className="w-3 h-3" />
                               </Button>
                            )}
                            {onDeleteEvent && (
                               <Button variant="ghost" size="icon" className="w-5 h-5 hover:bg-white text-muted-foreground hover:text-destructive" onClick={() => { setOpen(false); onDeleteEvent(e); }}>
                                  <Trash2 className="w-3 h-3" />
                               </Button>
                            )}
                         </div>
                      </div>
                   ))}
                </div>
             ) : (
                <p className="text-xs text-muted-foreground text-center py-2">No events recorded on this day.</p>
             )}

             {onAddEvent && (
                <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={() => { setOpen(false); onAddEvent(cell.dateStr); }}>
                   <Plus className="w-3 h-3 mr-1" /> Add Event Here
                </Button>
             )}
          </div>
       </PopoverContent>
    </Popover>
  );
}


/* ── Expanded Day Cell (For the Full Screen Modal) ────────────────────── */

function ExpandedDayCell({ cell, onAddEvent, onEditEvent, onDeleteEvent }: DayCellProps) {
  const primaryEvent = cell.events.find((e) => e.dayType !== "WORKING");
  const style = primaryEvent ? DAY_STYLES[primaryEvent.dayType] : null;

  const base = "relative flex flex-col p-2 min-h-[90px] border border-border/50";
  const opacity = cell.isCurrentMonth ? "bg-background hover:bg-muted/30" : "bg-muted/10 text-muted-foreground opacity-50";
  const todayStyles = cell.isToday ? "ring-2 ring-primary ring-inset z-10" : "";
  const eventBg = style ? `${style.bg}` : "";
  const sundayStyle = cell.isSunday && cell.isCurrentMonth && !style ? "bg-red-50/30 dark:bg-red-950/10 text-red-700" : "";

  return (
    <div className={`${base} ${opacity} ${todayStyles} ${eventBg} ${sundayStyle} group`}>
       <div className="flex justify-between items-start mb-1">
          <span className={`font-semibold ${cell.isToday ? 'text-primary' : ''}`}>{cell.day}</span>
          {cell.isCurrentMonth && onAddEvent && (
             <Button variant="ghost" size="icon" className="w-5 h-5 opacity-0 group-hover:opacity-100 htransition-opacity -mr-1 -mt-1" onClick={() => onAddEvent(cell.dateStr)}>
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
             </Button>
          )}
       </div>

       <div className="flex-1 flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-0.5">
          {cell.events.map(e => (
             <div key={e.eventId} className="bg-background border shadow-sm rounded-sm px-1.5 py-1 text-[10px] leading-tight relative group/event cursor-pointer">
                <div className="flex items-center gap-1 mb-0.5">
                   <span className={`w-1.5 h-1.5 rounded-full ${DAY_STYLES[e.dayType].dot}`} />
                   <span className="font-medium truncate">{e.title || e.dayType.replace(/_/g, " ")}</span>
                </div>
                
                <div className="hidden absolute right-0 inset-y-0 bg-background/90 group-hover/event:flex items-center px-0.5">
                   {onEditEvent && <Edit className="w-3 h-3 text-muted-foreground hover:text-primary mx-0.5" onClick={(ev) => { ev.stopPropagation(); onEditEvent(e);} } />}
                   {onDeleteEvent && <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive mx-0.5" onClick={(ev) => { ev.stopPropagation(); onDeleteEvent(e);}} />}
                </div>
             </div>
          ))}
       </div>
    </div>
  );
}
