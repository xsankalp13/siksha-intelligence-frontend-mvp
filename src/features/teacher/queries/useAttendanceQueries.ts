/**
 * useAttendanceQueries
 *
 * Shared TanStack Query hooks for the teacher attendance workflow.
 * Extracted from page.tsx and QuickAttendanceGrid.tsx for reuse.
 */

import { useQuery } from "@tanstack/react-query";
import { attendanceService } from "@/services/attendance";
import { hrmsService } from "@/services/hrms";

// ── Query key factory ─────────────────────────────────────────────────

export const attendanceKeys = {
  all: ["ams"] as const,
  types: () => [...attendanceKeys.all, "types"] as const,
  sectionRecords: (sectionUuid: string, fromDate: string, toDate: string) =>
    [...attendanceKeys.all, "section", sectionUuid, fromDate, toDate] as const,
  calendarEvents: (date: string) =>
    ["hrms", "calendar", "events", date] as const,
};

// ── Hooks ─────────────────────────────────────────────────────────────

/**
 * Fetch all attendance types (present / absent / late short-codes).
 * Cached for 5 minutes — types rarely change.
 */
export function useAttendanceTypes() {
  return useQuery({
    queryKey: attendanceKeys.types(),
    queryFn: async () => (await attendanceService.getAllTypes()).data,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch attendance records for a section on a given date range.
 * Pass `enabled: false` (or undefined sectionUuid) to skip fetching.
 */
export function useSectionAttendance(
  params: {
    sectionUuid: string;
    fromDate: string;
    toDate: string;
    size?: number;
  } | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: params
      ? attendanceKeys.sectionRecords(params.sectionUuid, params.fromDate, params.toDate)
      : (["ams", "section", "disabled"] as const),
    queryFn: async () => {
      if (!params) return null;
      return (
        await attendanceService.listStudentAttendance({
          sectionUuid: params.sectionUuid,
          fromDate: params.fromDate,
          toDate: params.toDate,
          size: params.size ?? 500,
        })
      ).data;
    },
    enabled: enabled && Boolean(params?.sectionUuid),
    staleTime: 30_000,
  });
}

/**
 * Fetch HRMS calendar events for a given date (used to detect holidays).
 */
export function useCalendarEventsForDate(date: string) {
  return useQuery({
    queryKey: attendanceKeys.calendarEvents(date),
    queryFn: () => {
      const d = new Date(date);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const ay = m >= 4 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
      return hrmsService
        .listCalendarEvents({ month: m, academicYear: ay, fromDate: date, toDate: date })
        .then((r) => r.data);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
