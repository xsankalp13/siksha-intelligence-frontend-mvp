import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicClassService } from '@/services/academicClass';
import { academicsService } from '@/services/academics';
import type { SectionRequestDto } from '@/services/types/academics';

export const useGetClasses = () => {
    return useQuery({
        queryKey: ['academic-classes'],
        queryFn: academicClassService.getAllClasses,
        staleTime: 5 * 60 * 1000,
    });
};

export const useGetSections = (classId: string | undefined) => {
    return useQuery({
        queryKey: ['academic-sections', classId],
        queryFn: () => academicClassService.getSectionsForClass(classId!),
        enabled: !!classId,
        staleTime: 5 * 60 * 1000,
    });
};

export const useUpdateSection = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ sectionId, data }: { sectionId: string; data: SectionRequestDto }) => 
            academicsService.updateSection(sectionId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['academic-sections'] });
        },
    });
};
