import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeslotService } from '@/services/timeslot';
import type { TimeslotRequestDto } from '@/features/academics/timetable_management/types';
import { toast } from 'sonner';

const QUERY_KEYS = {
    all: ['timeslots'] as const,
    byDay: (day?: number) => ['timeslots', { day }] as const,
};

export const useGetTimeslots = (dayOfWeek?: number) => {
    return useQuery({
        queryKey: QUERY_KEYS.byDay(dayOfWeek),
        queryFn: () => timeslotService.getAllTimeslots(dayOfWeek),
        staleTime: 5 * 60 * 1000,
    });
};

export const useCreateTimeslot = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: TimeslotRequestDto) => timeslotService.createTimeslot(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
            queryClient.invalidateQueries({ queryKey: ['timetable'] });
            toast.success('Timeslot created successfully');
        },
        onError: () => {
            toast.error('Failed to create timeslot');
        }
    });
};

export const useUpdateTimeslot = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: TimeslotRequestDto }) => 
            timeslotService.updateTimeslot(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
            queryClient.invalidateQueries({ queryKey: ['timetable'] });
            toast.success('Timeslot updated successfully');
        },
        onError: () => {
            toast.error('Failed to update timeslot');
        }
    });
};

export const useDeleteTimeslot = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => timeslotService.deleteTimeslot(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
            queryClient.invalidateQueries({ queryKey: ['timetable'] });
            toast.success('Timeslot deleted successfully');
        },
        onError: () => {
            toast.error('Failed to delete timeslot');
        }
    });
};
