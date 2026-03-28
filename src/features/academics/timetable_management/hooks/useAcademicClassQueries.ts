import { useQuery } from '@tanstack/react-query';
import { academicClassService } from '@/services/academicClass';

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
