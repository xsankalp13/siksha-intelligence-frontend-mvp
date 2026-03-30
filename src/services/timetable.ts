import { api } from "@/lib/axios";
import type {
    TimetableOverviewDto,
    ScheduleResponseDto,
    ScheduleRequestDto,
    EditorContextDto,
} from '../features/academics/timetable_management/types';

export const timetableService = {
    /**
     * Fetch the macroscopic overview of all classes and their timetable statuses.
     */
    getOverview: async (): Promise<TimetableOverviewDto[]> => {
        const response = await api.get('/auth/schedules/overview');
        return response.data;
    },

    /**
     * Fetch the complete bootstrap context for the Editor in ONE request.
     * Includes section info, timeslots, available subjects, teachers, and existing schedule.
     */
    getEditorContext: async (sectionId: string): Promise<EditorContextDto> => {
        const response = await api.get(`/auth/sections/${sectionId}/editor-context`);
        return response.data;
    },

    /**
     * Fetch the detailed schedule for a specific section (readonly view / dashboard).
     */
    getSectionSchedule: async (sectionId: string): Promise<ScheduleResponseDto[]> => {
        const response = await api.get(`/auth/sections/${sectionId}/schedule`);
        return response.data;
    },

    /**
     * Replace the ENTIRE week's schedule for a given section in one atomic transaction.
     */
    bulkReplaceSectionSchedule: async (sectionId: string, payload: ScheduleRequestDto[]): Promise<ScheduleResponseDto[]> => {
        const response = await api.put(`/auth/sections/${sectionId}/schedule/bulk`, payload);
        return response.data;
    },

    /**
     * Mark the entire section's timetable as DRAFT or PUBLISHED without changing content.
     */
    updateScheduleStatus: async (sectionId: string, statusType: 'draft' | 'publish'): Promise<string> => {
        const response = await api.patch(`/auth/schedules/${sectionId}/status/${statusType}`);
        return response.data;
    },

    /**
     * Delete the entire schedule for a given section.
     */
    deleteSectionSchedule: async (sectionId: string): Promise<void> => {
        await api.delete(`/auth/sections/${sectionId}/schedule`);
    }
};
