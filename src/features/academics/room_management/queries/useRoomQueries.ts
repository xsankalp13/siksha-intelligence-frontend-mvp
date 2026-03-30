import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicsService } from '@/services/academics';
import type { RoomRequestDto } from '@/services/types/academics';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';

const QUERY_KEYS = {
    rooms: ['academics', 'rooms'] as const,
};

export const useGetRooms = () => {
    return useQuery({
        queryKey: QUERY_KEYS.rooms,
        queryFn: () => academicsService.getAllRooms().then(res => res.data),
    });
};

export const useCreateRoom = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: RoomRequestDto) => academicsService.createRoom(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.rooms });
            toast.success('Room created successfully');
        },
        onError: () => {
            toast.error('Failed to create room');
        }
    });
};

export const useUpdateRoom = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ roomId, data }: { roomId: string; data: RoomRequestDto }) => 
            academicsService.updateRoom(roomId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.rooms });
            toast.success('Room updated successfully');
        },
        onError: () => {
            toast.error('Failed to update room');
        }
    });
};

export const useDeleteRoom = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (roomId: string) => academicsService.deleteRoom(roomId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.rooms });
            toast.success('Room deleted successfully.');
        },
        onError: (error) => {
            if (isAxiosError(error) && error.response) {
                const status = error.response.status;
                if (status === 409) {
                    toast.error('Room is currently mapped in timetable. Reassign schedules before deleting this room.');
                    return;
                } else if (status === 404) {
                    toast.error('Room not found or already deleted.');
                    return;
                }
            }
            toast.error('Unable to delete room right now. Please try again.');
        }
    });
};
