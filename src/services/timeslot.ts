import { api } from "@/lib/axios";
import type { TimeslotRequestDto, TimeslotResponseDto } from "@/features/academics/timetable_management/types";

export const timeslotService = {
    getAllTimeslots: async (dayOfWeek?: number): Promise<TimeslotResponseDto[]> => {
        const params = dayOfWeek !== undefined ? { dayOfWeek } : {};
        const response = await api.get('/auth/timeslots', { params });
        return response.data;
    },

    getTimeslotById: async (id: string): Promise<TimeslotResponseDto> => {
        const response = await api.get(`/auth/timeslots/${id}`);
        return response.data;
    },

    createTimeslot: async (data: TimeslotRequestDto): Promise<TimeslotResponseDto> => {
        const response = await api.post('/auth/timeslots', data);
        return response.data;
    },

    updateTimeslot: async (id: string, data: TimeslotRequestDto): Promise<TimeslotResponseDto> => {
        const response = await api.put(`/auth/timeslots/${id}`, data);
        return response.data;
    },

    deleteTimeslot: async (id: string): Promise<void> => {
        await api.delete(`/auth/timeslots/${id}`);
    }
};
