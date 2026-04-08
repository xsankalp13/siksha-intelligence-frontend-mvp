import { api } from '@/lib/axios';
import type { EditorContextDto } from '@/features/academics/timetable_management/types';
import type { LectureLogResponse } from './types/lectureLogs';

export const studentTimetableService = {
  /**
   * Returns the published timetable context for the authenticated student's section.
   * Includes: timeslots, subjects, teachers, existing schedule entries.
   */
  getTimetableContext: async (): Promise<EditorContextDto> => {
    const response = await api.get<EditorContextDto>('/student/timetable/context');
    return response.data;
  },

  /**
   * Returns the teacher's lecture log for a schedule entry UUID.
   * Returns null if the teacher has not yet logged this lecture (204 response).
   */
  getLectureLog: async (scheduleUuid: string): Promise<LectureLogResponse | null> => {
    try {
      const response = await api.get<LectureLogResponse>(`/student/timetable/lecture-log/${scheduleUuid}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 204) {
        return null;
      }
      throw error;
    }
  },
};
