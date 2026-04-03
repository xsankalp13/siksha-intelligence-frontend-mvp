import { api } from "@/lib/axios";
import type { NestedRoomResponseDto } from "./types/academics";

export interface SectionResponseDto {
    uuid: string;
    sectionName: string;
    defaultRoom?: NestedRoomResponseDto;
}

export interface AcademicClassResponseDto {
    classId: string;
    name: string;
}

export const academicClassService = {
    getAllClasses: async (): Promise<AcademicClassResponseDto[]> => {
        const response = await api.get('/auth/classes');
        return response.data;
    },

    getSectionsForClass: async (classId: string): Promise<SectionResponseDto[]> => {
        const response = await api.get(`/auth/classes/${classId}/sections`);
        return response.data;
    }
};
