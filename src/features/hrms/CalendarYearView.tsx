import { useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { settingsService } from "@/features/super-admin/services/superAdminService";
import type { CalendarEventResponseDTO, DayType } from "@/services/types/hrms";

/* ── Constants ──────────────────────────────────────────────────────── */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DAY_STYLES: Record<DayType, { bg: string; border: string; text: string; label: string; printBg: string }> = {
  HOLIDAY:             { bg: "bg-green-200 dark:bg-green-700/50",      border: "border-green-400 dark:border-green-500",    text: "text-green-900 dark:text-green-100", label: "Government / General Holiday", printBg: "#bbf7d0" },
  HALF_DAY:            { bg: "bg-yellow-200 dark:bg-yellow-700/50",    border: "border-yellow-400 dark:border-yellow-500",  text: "text-yellow-900 dark:text-yellow-100", label: "Half Day",                   printBg: "#fef08a" },
  RESTRICTED_HOLIDAY:  { bg: "bg-orange-200 dark:bg-orange-700/50",    border: "border-orange-400 dark:border-orange-500",  text: "text-orange-900 dark:text-orange-100", label: "Restricted Holiday",        printBg: "#fed7aa" },
  VACATION:            { bg: "bg-cyan-200 dark:bg-cyan-700/50",        border: "border-cyan-400 dark:border-cyan-500",      text: "text-cyan-900 dark:text-cyan-100",   label: "Vacation",                    printBg: "#a5f3fc" },
  EXAM_DAY:            { bg: "bg-fuchsia-200 dark:bg-fuchsia-700/50",  border: "border-fuchsia-400 dark:border-fuchsia-500",text: "text-fuchsia-900 dark:text-fuchsia-100", label: "Exam Day",                printBg: "#f5d0fe" },
  WORKING:             { bg: "",                                        border: "",                                          text: "",                                    label: "Working Day",                 printBg: "#ffffff" },
};

/* ── Helpers ─────────────────────────────────────────────────────────── */

interface CalendarCell {
  day: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSunday: boolean;
  events: CalendarEventResponseDTO[];
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
      isSunday: cells.length % 7 === 0, events: eventsByDate.get(key) ?? [],
    });
  }

  // Current month
  for (let d = 1; d <= totalDays; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({
      day: d, month, year, isCurrentMonth: true, isToday: key === todayStr,
      isSunday: cells.length % 7 === 0, events: eventsByDate.get(key) ?? [],
    });
  }

  // Next month fill (to complete last row)
  const remainder = cells.length % 7;
  if (remainder > 0) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    for (let d = 1; d <= 7 - remainder; d++) {
      const key = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        day: d, month: nextMonth, year: nextYear, isCurrentMonth: false, isToday: false,
        isSunday: cells.length % 7 === 0, events: eventsByDate.get(key) ?? [],
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

/* ── Print helper ────────────────────────────────────────────────────── */

function generatePrintHtml(
  year: number,
  month: number,
  grid: CalendarCell[][],
  events: CalendarEventResponseDTO[],
  schoolName?: string,
  logoUrl?: string,
): string {
  const monthEvents = events.filter(
    (e) => e.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`) && e.dayType !== "WORKING",
  );

  const tableRows = monthEvents
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(
      (e) => `<tr>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;">${e.date}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;">${e.title || "-"}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;background:${DAY_STYLES[e.dayType]?.printBg ?? "#fff"}">${e.dayType.replace(/_/g, " ")}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb;">${e.appliesToStaff ? "Staff" : ""}${e.appliesToStaff && e.appliesToStudents ? ", " : ""}${e.appliesToStudents ? "Students" : ""}</td>
      </tr>`,
    )
    .join("");

  const calendarCells = grid
    .map(
      (week) =>
        `<tr>${week
          .map((cell) => {
            const ev = cell.events.find((e) => e.dayType !== "WORKING");
            const bg = ev ? DAY_STYLES[ev.dayType]?.printBg ?? "#fff" : cell.isSunday && cell.isCurrentMonth ? "#f9fafb" : "#fff";
            const opacity = cell.isCurrentMonth ? "1" : "0.3";
            const border = cell.isToday ? "2px solid #2563eb" : "1px solid #e5e7eb";
            const dot = ev ? `<div style="width:6px;height:6px;border-radius:50%;background:${ev.dayType === 'HOLIDAY' ? '#dc2626' : ev.dayType === 'HALF_DAY' ? '#d97706' : '#6366f1'};margin:2px auto 0;"></div>` : "";
            return `<td style="width:14.28%;text-align:center;padding:8px 4px;border:${border};background:${bg};opacity:${opacity};vertical-align:top;font-size:13px;">
              <div style="font-weight:${cell.isToday ? 700 : 400}">${cell.day}</div>${dot}
            </td>`;
          })
          .join("")}</tr>`,
    )
    .join("");

  const legendItems = Object.entries(DAY_STYLES)
    .filter(([key]) => key !== "WORKING")
    .map(
      ([, style]) => `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:16px;">
        <span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:${style.printBg};border:1px solid #d1d5db;"></span>
        <span style="font-size:11px;">${style.label}</span>
      </span>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html><head>
<title>${MONTH_NAMES[month]} ${year} — Leave Calendar</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; color: #1f2937; }
  table { border-collapse: collapse; width: 100%; }
  .header { margin-bottom: 16px; }
  .brand-row { display: flex; align-items: center; justify-content: center; gap: 10px; }
  .header h1 { font-size: 22px; font-weight: 700; margin: 10px 0 2px; text-align: center; }
  .header h2 { font-size: 16px; font-weight: 400; color: #6b7280; text-align: center; }
  .logo { width: 48px; height: 48px; object-fit: contain; border-radius: 6px; }
  .school-name { font-size: 20px; font-weight: 700; color: #334155; }
  .dow-header th { padding: 8px; background: #1e293b; color: #fff; text-align: center; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .legend { margin: 12px 0; padding: 8px 0; border-top: 1px solid #e5e7eb; }
  .events-section { margin-top: 20px; page-break-inside: avoid; }
  .events-section h3 { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
  .events-table th { padding: 6px 10px; background: #f3f4f6; border: 1px solid #e5e7eb; font-size: 12px; text-align: left; }
  .events-table td { font-size: 12px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>
  <div class="header">
    <div class="brand-row">
      ${logoUrl ? `<img src="${logoUrl}" alt="School logo" class="logo" />` : ""}
      ${schoolName ? `<p class="school-name">${schoolName}</p>` : ""}
    </div>
    <h1>Academic Calendar ${year}</h1>
    <h2>${MONTH_NAMES[month]} ${year}</h2>
  </div>

  <table>
    <thead><tr class="dow-header">${DOW.map((d) => `<th>${d}</th>`).join("")}</tr></thead>
    <tbody>${calendarCells}</tbody>
  </table>

  <div class="legend">${legendItems}</div>

  ${
    monthEvents.length > 0
      ? `<div class="events-section">
      <h3>Holidays &amp; Events — ${MONTH_NAMES[month]} ${year}</h3>
      <table class="events-table">
        <thead><tr><th>Date</th><th>Event</th><th>Type</th><th>Applies To</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>`
      : ""
  }

  <script>window.onload = function() { window.print(); }</script>
</body></html>`;
}

function generateYearPrintHtml(
  year: number,
  monthGrids: CalendarCell[][][],
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

  const monthEventsMap = new Map<number, CalendarEventResponseDTO[]>();
  for (let month = 0; month < 12; month++) {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const monthEvents = Array.from(eventsByDate.entries())
      .filter(([date]) => date.startsWith(monthPrefix))
      .flatMap(([, events]) => events)
      .filter((event) => event.dayType !== "WORKING")
      .sort((a, b) => a.date.localeCompare(b.date));
    monthEventsMap.set(month, monthEvents);
  }

  const renderMonth = (month: number): string => {
    const grid = monthGrids[month];
    const eventCount = monthEventsMap.get(month)?.length ?? 0;

    const rows = grid
      .map(
        (week) => `<tr>${week
          .map((cell) => {
            const key = `${cell.year}-${String(cell.month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
            const events = eventsByDate.get(key) ?? [];
            const primary = events.find((e) => e.dayType !== "WORKING");
            const bg = primary
              ? DAY_STYLES[primary.dayType]?.printBg ?? "#ffffff"
              : cell.isSunday && cell.isCurrentMonth
                ? "#f8fafc"
                : "#ffffff";
            const opacity = cell.isCurrentMonth ? "1" : "0.28";
            const fontWeight = cell.isToday ? "700" : "400";
            return `<td style="width:14.28%;border:1px solid #e5e7eb;text-align:center;padding:3px 0;font-size:10px;background:${bg};opacity:${opacity};font-weight:${fontWeight};">${cell.day}</td>`;
          })
          .join("")}</tr>`,
      )
      .join("");

    return `<section class="month-card">
      <div class="month-head">
        <span>${MONTH_NAMES[month]} ${year}</span>
        <span>${eventCount} ${eventCount === 1 ? "event" : "events"}</span>
      </div>
      <table>
        <thead><tr>${DOW.map((d) => `<th>${d}</th>`).join("")}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
  };

  const monthsGrid = Array.from({ length: 12 }, (_, i) => renderMonth(i)).join("");

  const monthTables = Array.from({ length: 12 }, (_, month) => {
    const monthEvents = monthEventsMap.get(month) ?? [];
    if (monthEvents.length === 0) {
      return "";
    }

    const rows = monthEvents
      .map(
        (event) => `<tr>
          <td>${event.date}</td>
          <td>${event.title || "-"}</td>
          <td style="background:${DAY_STYLES[event.dayType]?.printBg ?? "#fff"}">${event.dayType.replace(/_/g, " ")}</td>
          <td>${event.appliesToStaff ? "Staff" : ""}${event.appliesToStaff && event.appliesToStudents ? ", " : ""}${event.appliesToStudents ? "Students" : ""}</td>
        </tr>`,
      )
      .join("");

    return `<section class="month-table-wrap">
      <h3>${MONTH_NAMES[month]} ${year}</h3>
      <table class="events-table">
        <thead><tr><th>Date</th><th>Leave / Event</th><th>Type</th><th>Applies To</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
  }).join("");

  return `<!DOCTYPE html>
<html><head>
<title>${year} Leave Calendar</title>
<style>
  @page { size: A4 portrait; margin: 7mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; color: #0f172a; }
  .page { min-height: 100%; }
  .header { margin-bottom: 6px; }
  .brand-row { display: flex; align-items: center; justify-content: center; gap: 8px; }
  .header h1 { font-size: 16px; line-height: 1.2; text-align: center; margin-top: 10px; }
  .logo { width: 34px; height: 34px; object-fit: contain; border-radius: 4px; }
  .school-name { font-size: 20px; font-weight: 700; color: #334155; }
  .legend { margin: 4px 0 7px; border-top: 1px solid #e2e8f0; padding-top: 6px; }
  .months { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .month-card { border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; break-inside: avoid; }
  .month-head { padding: 4px 6px; background: #0f172a; color: #f8fafc; display: flex; justify-content: space-between; font-size: 9px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th { background: #f1f5f9; border: 1px solid #e2e8f0; font-size: 8px; padding: 2px 0; color: #334155; }
  .tables-page { margin-top: 8px; }
  .tables-page h2 { font-size: 14px; margin-bottom: 6px; }
  .month-table-wrap { margin-bottom: 8px; page-break-inside: avoid; }
  .month-table-wrap h3 { font-size: 11px; margin-bottom: 3px; color: #0f172a; }
  .events-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .events-table th { padding: 5px 6px; font-size: 9px; border: 1px solid #e2e8f0; text-align: left; }
  .events-table td { padding: 4px 6px; font-size: 9px; border: 1px solid #e2e8f0; vertical-align: top; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>
  <div class="page">
    <div class="header">
      <div class="brand-row">
        ${logoUrl ? `<img src="${logoUrl}" alt="School logo" class="logo" />` : ""}
        ${schoolName ? `<p class="school-name">${schoolName}</p>` : ""}
      </div>
      <h1>Academic Calendar ${year}</h1>
    </div>
    <div class="legend">${legendItems}</div>
    <div class="months">${monthsGrid}</div>
  </div>
  ${monthTables ? `<div class="tables-page"><h2>Leaves / Holidays Table (Month-wise)</h2>${monthTables}</div>` : ""}
  <script>window.onload = function() { window.print(); }</script>
</body></html>`;
}

/* ── Component ───────────────────────────────────────────────────────── */

interface CalendarYearViewProps {
  year: number;
  onYearChange: (year: number) => void;
  events: CalendarEventResponseDTO[];
}

export default function CalendarYearView({ year, onYearChange, events }: CalendarYearViewProps) {
  const printRef = useRef<Window | null>(null);
  const { data: whiteLabel } = useQuery({
    queryKey: ["settings", "whitelabel"],
    queryFn: () => settingsService.getWhiteLabel().then((res) => res.data),
  });

  // Build event lookup map: "YYYY-MM-DD" -> events[]
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEventResponseDTO[]>();
    for (const event of events) {
      const key = event.date; // already "YYYY-MM-DD"
      const existing = map.get(key);
      if (existing) existing.push(event);
      else map.set(key, [event]);
    }
    return map;
  }, [events]);

  // Build grids for all 12 months
  const monthGrids = useMemo(
    () => Array.from({ length: 12 }, (_, i) => buildMonthGrid(year, i, eventsByDate)),
    [year, eventsByDate],
  );

  // Count non-working events per month
  const monthEventCounts = useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) =>
        events.filter(
          (e) =>
            e.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`) &&
            e.dayType !== "WORKING",
        ).length,
      ),
    [year, events],
  );

  const handlePrintMonth = useCallback(
    (month: number) => {
      const html = generatePrintHtml(
        year,
        month,
        monthGrids[month],
        events,
        whiteLabel?.schoolName,
        whiteLabel?.logoUrl,
      );
      const win = window.open("", "_blank");
      if (!win) return;
      printRef.current = win;
      win.document.write(html);
      win.document.close();
    },
    [year, monthGrids, events, whiteLabel?.schoolName, whiteLabel?.logoUrl],
  );

  const handlePrintYear = useCallback(() => {
    const html = generateYearPrintHtml(
      year,
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
  }, [year, monthGrids, eventsByDate, whiteLabel?.schoolName, whiteLabel?.logoUrl]);

  // Active dayType legend entries (only show types that exist in current year)
  const activeDayTypes = useMemo(() => {
    const types = new Set(events.filter((e) => e.dayType !== "WORKING").map((e) => e.dayType));
    return Object.entries(DAY_STYLES).filter(([key]) => key !== "WORKING" && types.has(key as DayType));
  }, [events]);

  return (
    <div className="space-y-5">
      {/* Year Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => onYearChange(year - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold tabular-nums">{year}</h2>
          <Button variant="outline" size="icon" onClick={() => onYearChange(year + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {events.filter((e) => e.dayType !== "WORKING").length} holidays/events marked
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handlePrintYear}>
          <Printer className="mr-2 h-4 w-4" /> Print 12-Month Calendar
        </Button>
      </div>

      {/* Legend */}
      {activeDayTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 px-4 py-2.5">
          <span className="mr-1 text-xs font-medium text-muted-foreground">Legend:</span>
          {activeDayTypes.map(([key, style]) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span className={`inline-block h-3 w-3 rounded-sm border ${style.bg} ${style.border}`} />
              <span className="text-xs">{style.label}</span>
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm border bg-muted" />
            <span className="text-xs">Sunday</span>
          </span>
        </div>
      )}

      {/* 12 Month Grid */}
      <TooltipProvider delayDuration={200}>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {monthGrids.map((grid, monthIdx) => (
            <MonthCard
              key={monthIdx}
              year={year}
              month={monthIdx}
              grid={grid}
              eventCount={monthEventCounts[monthIdx]}
              onPrint={() => handlePrintMonth(monthIdx)}
            />
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}

/* ── Month Card ──────────────────────────────────────────────────────── */

interface MonthCardProps {
  year: number;
  month: number;
  grid: CalendarCell[][];
  eventCount: number;
  onPrint: () => void;
}

function MonthCard({ year, month, grid, eventCount, onPrint }: MonthCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md">
      {/* Month Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-2.5 dark:from-slate-700 dark:to-slate-600">
        <div>
          <h3 className="text-sm font-semibold text-white">{MONTH_NAMES[month]}</h3>
          <span className="text-[11px] text-slate-300">{year}</span>
        </div>
        <div className="flex items-center gap-2">
          {eventCount > 0 && (
            <Badge variant="secondary" className="h-5 text-[10px]">
              {eventCount} {eventCount === 1 ? "event" : "events"}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/70 hover:bg-white/10 hover:text-white"
            onClick={onPrint}
            title={`Print ${MONTH_NAMES[month]} ${year}`}
          >
            <Printer className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {DOW.map((d) => (
          <div
            key={d}
            className={`py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider ${
              d === "Sun" ? "text-red-500" : "text-muted-foreground"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="p-1">
        {grid.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((cell, di) => (
              <DayCell key={`${wi}-${di}`} cell={cell} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Day Cell ────────────────────────────────────────────────────────── */

function DayCell({ cell }: { cell: CalendarCell }) {
  const primaryEvent = cell.events.find((e) => e.dayType !== "WORKING");
  const style = primaryEvent ? DAY_STYLES[primaryEvent.dayType] : null;

  const base = "relative flex aspect-square items-center justify-center rounded-md text-xs transition-all";
  const opacity = cell.isCurrentMonth ? "" : "opacity-25";
  const todayRing = cell.isToday ? "ring-2 ring-primary ring-offset-1" : "";
  const sundayStyle = cell.isSunday && cell.isCurrentMonth && !style ? "bg-muted/60 text-muted-foreground" : "";
  const eventBg = style ? `${style.bg} ${style.border} border ${style.text} font-medium` : "";
  const hover = cell.isCurrentMonth && primaryEvent ? "cursor-pointer hover:scale-110 hover:shadow-md" : "";

  const content = (
    <div className={`${base} ${opacity} ${todayRing} ${sundayStyle} ${eventBg} ${hover}`}>
      <span>{cell.day}</span>
      {primaryEvent && cell.isCurrentMonth && (
        <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-current" />
      )}
    </div>
  );

  if (!primaryEvent || !cell.isCurrentMonth) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] space-y-1">
        {cell.events
          .filter((e) => e.dayType !== "WORKING")
          .map((e) => (
            <div key={e.eventId}>
              <p className="font-medium">{e.title || e.dayType.replace(/_/g, " ")}</p>
              <p className="text-[10px] opacity-80">
                {e.dayType.replace(/_/g, " ")}
                {e.appliesToStaff && e.appliesToStudents
                  ? " · All"
                  : e.appliesToStaff
                    ? " · Staff"
                    : e.appliesToStudents
                      ? " · Students"
                      : ""}
              </p>
              {e.description && <p className="text-[10px] opacity-70">{e.description}</p>}
            </div>
          ))}
      </TooltipContent>
    </Tooltip>
  );
}
