import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicsService } from '@/services/academics';
import type { BuildingRequestDto } from '@/services/types/academics';
import { toast } from 'sonner';

const QUERY_KEYS = {
    buildings: ['academics', 'buildings'] as const,
};

export const useGetBuildings = () => {
    return useQuery({
        queryKey: QUERY_KEYS.buildings,
        queryFn: () => academicsService.getAllBuildings().then(res => res.data),
    });
};

export const useCreateBuilding = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: BuildingRequestDto) => academicsService.createBuilding(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.buildings });
            toast.success('Building created successfully');
        },
        onError: () => {
            toast.error('Failed to create building');
        }
    });
};

export const useUpdateBuilding = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ buildingId, data }: { buildingId: string; data: BuildingRequestDto }) =>
            academicsService.updateBuilding(buildingId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.buildings });
            toast.success('Building updated successfully');
        },
        onError: () => {
            toast.error('Failed to update building');
        }
    });
};

export const useDeleteBuilding = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (buildingId: string) => academicsService.deleteBuilding(buildingId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.buildings });
            toast.success('Building deleted successfully');
        },
        onError: () => {
            toast.error('Failed to delete building. It may still have rooms assigned.');
        }
    });
};
