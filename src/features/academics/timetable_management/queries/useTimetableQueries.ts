import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timetableService } from '@/services/timetable';
import { academicsService } from '@/services/academics';
import { dataFetchService } from '@/services/dataFetch';
import type { ScheduleRequestDto } from '../types';
import { toast } from 'sonner';

const QUERY_KEYS = {
    overview: ['timetable', 'overview'] as const,
    section: (sectionId: string) => ['timetable', 'section', sectionId] as const,
    editorContext: (sectionId: string) => ['timetable', 'editor-context', sectionId] as const,
    rooms: ['timetable', 'rooms'] as const,
};

export const useGetTimetableOverview = () => {
    return useQuery({
        queryKey: QUERY_KEYS.overview,
        queryFn: timetableService.getOverview,
        staleTime: 0, // Always refetch fresh data for dashboard
    });
};

export const useGetSectionSchedule = (sectionId: string | undefined) => {
    return useQuery({
        queryKey: QUERY_KEYS.section(sectionId!),
        queryFn: () => timetableService.getSectionSchedule(sectionId!),
        enabled: !!sectionId,
        staleTime: 10 * 1000,
    });
};

export const useGetEditorContext = (sectionId: string | undefined) => {
    return useQuery({
        queryKey: QUERY_KEYS.editorContext(sectionId!),
        queryFn: () => timetableService.getEditorContext(sectionId!),
        enabled: !!sectionId,
        staleTime: 10 * 1000,
    });
};

export const useGetRooms = () => {
    return useQuery({
        queryKey: QUERY_KEYS.rooms,
        queryFn: () => academicsService.getAllRooms().then(res => res.data),
        staleTime: 10 * 60 * 1000,
    });
};

export const useGetAvailableTeachers = (subjectId: string | undefined, sectionId: string | undefined, timeslotId: string | undefined) => {
    return useQuery({
        queryKey: ['timetable', 'available-teachers', subjectId, sectionId, timeslotId],
        queryFn: async () => {
            const res = await dataFetchService.getAvailableTeachers(subjectId!, sectionId, timeslotId);
            return res.data;
        },
        enabled: !!subjectId,
        staleTime: 60 * 1000,
    });
};

export const useBulkUpdateSchedule = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sectionId, payload }: { sectionId: string; payload: ScheduleRequestDto[] }) =>
            timetableService.bulkReplaceSectionSchedule(sectionId, payload),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.section(variables.sectionId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.editorContext(variables.sectionId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.overview });
            toast.success('Timetable schedule saved successfully.');
        },
        onError: () => {
            toast.error('Failed to save timetable. Please try again.');
        }
    });
};

export const useUpdateScheduleStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ sectionId, statusType }: { sectionId: string; statusType: 'draft' | 'publish' }) => 
            timetableService.updateScheduleStatus(sectionId, statusType),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.section(variables.sectionId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.overview });
            toast.success(`Timetable marked as ${variables.statusType === 'draft' ? 'Draft' : 'Published'}.`);
        },
        onError: () => {
            toast.error('Failed to update timetable status.');
        }
    });
};

export const useDeleteSectionSchedule = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (sectionId: string) => timetableService.deleteSectionSchedule(sectionId),
        onSuccess: (_, sectionId) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.section(sectionId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.editorContext(sectionId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.overview });
            toast.success('Timetable deleted successfully.');
        },
        onError: () => {
            toast.error('Failed to delete timetable.');
        }
    });
};
