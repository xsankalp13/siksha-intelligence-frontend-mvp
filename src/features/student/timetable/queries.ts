import { useQuery } from '@tanstack/react-query';
import { studentTimetableService } from '@/services/studentTimetable';

export const timetableKeys = {
  context: ['student', 'timetable', 'context'] as const,
  lectureLog: (scheduleUuid: string) => ['student', 'timetable', 'lectureLog', scheduleUuid] as const,
};

/**
 * Fetches the student's published timetable context (section info, timeslots, subjects, teachers, schedule).
 * Cached for 10 minutes — timetable rarely changes.
 */
export function useStudentTimetableContext() {
  return useQuery({
    queryKey: timetableKeys.context,
    queryFn: () => studentTimetableService.getTimetableContext(),
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * Fetches the lecture log for a specific schedule entry.
 * Only fires when a scheduleUuid is provided.
 */
export function useScheduleLectureLog(scheduleUuid: string | null) {
  return useQuery({
    queryKey: timetableKeys.lectureLog(scheduleUuid ?? ''),
    queryFn: () => studentTimetableService.getLectureLog(scheduleUuid!),
    enabled: !!scheduleUuid,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
