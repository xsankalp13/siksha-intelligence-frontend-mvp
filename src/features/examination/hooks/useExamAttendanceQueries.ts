import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examAttendanceService } from '@/services/examAttendance';
import type {
    ExamAttendanceMarkRequestDTO,
    ExamAttendanceFinalizeRequestDTO
} from '@/services/types/examAttendance';
import { toast } from 'sonner';

export const examAttendanceKeys = {
    all: ['examAttendance'] as const,
    invigilatorRooms: () => [...examAttendanceKeys.all, 'invigilatorRooms'] as const,
    roomRoster: (roomId: number, examScheduleId: number) => [...examAttendanceKeys.all, 'roomRoster', roomId, examScheduleId] as const,
};

export const useInvigilatorRoomsQuery = () => {
    return useQuery({
        queryKey: examAttendanceKeys.invigilatorRooms(),
        queryFn: examAttendanceService.getInvigilatorRooms,
    });
};

export const useRoomAttendanceQuery = (roomId: number, examScheduleId: number) => {
    return useQuery({
        queryKey: examAttendanceKeys.roomRoster(roomId, examScheduleId),
        queryFn: () => examAttendanceService.getRoomRoster(roomId, examScheduleId),
        enabled: !!roomId && !!examScheduleId,
    });
};

export const useMarkAttendanceMutation = () => {
    return useMutation({
        mutationFn: (request: ExamAttendanceMarkRequestDTO) => examAttendanceService.markAttendance(request),
        onSuccess: (_, _variables) => {
            // We usually invalidate the room roster, but since marking can be frequent,
            // we might want to avoid full invalidation and rely on optimistic updates
            // or just let the caller handle success states to keep UI fast.
            // But we will invalidate to keep things in sync if needed eventually.
            // queryClient.invalidateQueries({ queryKey: examAttendanceKeys.roomRoster(variables.roomId, variables.examScheduleId) });
        },
        onError: (error) => {
            console.error('Failed to save attendance', error);
            toast.error('Failed to save attendance. Please retry.');
        }
    });
};

export const useFinalizeAttendanceMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (request: ExamAttendanceFinalizeRequestDTO) => examAttendanceService.finalizeAttendance(request),
        onSuccess: (_, variables) => {
            toast.success('Attendance submitted successfully.');
            queryClient.invalidateQueries({ queryKey: examAttendanceKeys.roomRoster(variables.roomId, variables.examScheduleId) });
            queryClient.invalidateQueries({ queryKey: examAttendanceKeys.invigilatorRooms() });
        },
        onError: (error) => {
            console.error('Failed to finalize attendance', error);
            toast.error('Could not finalize attendance. Please try again.');
        }
    });
};
