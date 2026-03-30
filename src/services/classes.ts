import { api } from "@/lib/axios";

import type { NestedRoomResponseDto } from "./types/academics";

export interface AcademicClassResponseDto {
  classId: string;
  name: string;
  sections: SectionResponseDto[];
}

export interface SectionResponseDto {
  uuid: string;
  sectionName: string;
  defaultRoom?: NestedRoomResponseDto;
}

// ── Service ──────────────────────────────────────────────────────────

export const classesService = {
  /** GET /auth/classes — list all academic classes with their sections */
  getClasses() {
    return api.get<AcademicClassResponseDto[]>("/auth/classes");
  },

  /** GET /auth/classes/{classId}/sections — list sections for a specific class */
  getSectionsForClass(classId: string) {
    return api.get<SectionResponseDto[]>(`/auth/classes/${classId}/sections`);
  },

  /** GET /auth/sections/{sectionId} */
  getSectionById(sectionId: string) {
    return api.get<SectionResponseDto>(`/auth/sections/${sectionId}`);
  },
};
