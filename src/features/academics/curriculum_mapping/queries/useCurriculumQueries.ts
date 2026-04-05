import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { curriculumService } from '@/services/curriculum';
import type { CurriculumSubjectUpsertDto, CurriculumPeriodsUpdateDto } from '../types';

const QUERY_KEYS = {
    overview: ['curriculum', 'overview'] as const,
    classCurriculum: (classId: string) => ['curriculum', 'class', classId] as const,
};

export const useGetCurriculumOverview = () => {
    return useQuery({
        queryKey: QUERY_KEYS.overview,
        queryFn: curriculumService.getOverview,
        staleTime: 5 * 60 * 1000,
    });
};

export const useGetClassCurriculum = (classId: string | undefined) => {
    return useQuery({
        queryKey: QUERY_KEYS.classCurriculum(classId!),
        queryFn: () => curriculumService.getClassCurriculum(classId!),
        enabled: !!classId,
        staleTime: 5 * 60 * 1000,
    });
};

export const useAddSubjectToClass = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ classId, body }: { classId: string; body: CurriculumSubjectUpsertDto }) =>
            curriculumService.addSubjectToClass(classId, body),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.classCurriculum(variables.classId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.overview });
            queryClient.invalidateQueries({ queryKey: ['timetable'] });
            toast.success('Subject added to curriculum.');
        },
        onError: () => toast.error('Failed to add subject. It may already be in the curriculum.'),
    });
};

export const useUpdateCurriculumPeriods = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (vars: { curriculumMapId: string; classId: string; body: CurriculumPeriodsUpdateDto }) =>
            curriculumService.updatePeriods(vars.curriculumMapId, vars.body),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.classCurriculum(variables.classId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.overview });
            queryClient.invalidateQueries({ queryKey: ['timetable'] });
            toast.success('Periods per week updated.');
        },
        onError: () => toast.error('Failed to update periods.'),
    });
};

export const useRemoveSubjectFromCurriculum = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (vars: { curriculumMapId: string; classId: string }) =>
            curriculumService.removeSubject(vars.curriculumMapId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.classCurriculum(variables.classId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.overview });
            queryClient.invalidateQueries({ queryKey: ['timetable'] });
            toast.success('Subject removed from curriculum.');
        },
        onError: () => toast.error('Failed to remove subject.'),
    });
};
