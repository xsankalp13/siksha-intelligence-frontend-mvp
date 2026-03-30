import { api } from "@/lib/axios";
import type {
  AvailableTeacherDto,
  AvailableSubjectDto,
  AvailableRoomDto,
} from "./types/dataFetch";

// ── Data Fetch Service ───────────────────────────────────────────────

export const dataFetchService = {
  /** GET /auth/data-fetch/teachers/available?subjectId=...&sectionId=...&timeslotId=... */
  getAvailableTeachers(subjectId: string, sectionId?: string, timeslotId?: string) {
    return api.get<AvailableTeacherDto[]>("/auth/data-fetch/teachers/available", {
      params: { subjectId, sectionId, timeslotId },
    });
  },

  /** GET /auth/data-fetch/subjects/available?sectionId=... */
  getAvailableSubjects(sectionId: string) {
    return api.get<AvailableSubjectDto[]>("/auth/data-fetch/subjects/available", {
      params: { sectionId },
    });
  },

  /** GET /auth/data-fetch/rooms/available?timeslotId=...&roomType=... */
  getAvailableRooms(timeslotId: string, roomType?: string) {
    return api.get<AvailableRoomDto[]>("/auth/data-fetch/rooms/available", {
      params: { timeslotId, roomType },
    });
  },
};
