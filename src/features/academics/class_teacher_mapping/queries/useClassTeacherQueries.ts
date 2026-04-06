import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { academicsService } from '@/services/academics';
import { adminService } from '@/services/admin';
import type { StaffSummaryDTO } from '@/services/admin';
import type { ClassTeacherMappingRow } from '../types';

const QUERY_KEYS = {
  mappings: ['class-teacher-mappings'] as const,
  teachers: ['class-teacher-teachers'] as const,
};

export const useGetClassTeacherMappings = () => {
  return useQuery({
    queryKey: QUERY_KEYS.mappings,
    queryFn: async (): Promise<ClassTeacherMappingRow[]> => {
      const classes = (await academicsService.getAllClasses()).data;

      if (!classes.length) {
        return [];
      }

      const sectionsByClass = await Promise.all(
        classes.map(async (cls) => {
          const sections = (await academicsService.getSectionsForClass(cls.classId)).data;
          return sections.map((section) => ({
            classId: cls.classId,
            className: cls.name,
            sectionId: section.uuid,
            sectionName: section.sectionName,
            classTeacherUuid: section.classTeacherUuid,
            classTeacherName: section.classTeacherName,
          }));
        })
      );

      return sectionsByClass.flat();
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useGetTeacherOptions = () => {
  return useQuery({
    queryKey: QUERY_KEYS.teachers,
    queryFn: async (): Promise<StaffSummaryDTO[]> => {
      const response = await adminService.listStaff({
        staffType: 'TEACHER',
        size: 1000,
        sortBy: 'firstName',
        sortDir: 'asc',
      });
      return (response.data.content ?? []).filter((teacher) => teacher.active);
    },
    staleTime: 10 * 60 * 1000,
  });
};

export const useAssignClassTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      sectionId: string;
      sectionName: string;
      classTeacherUuid: string;
    }) => {
      return academicsService.updateSection(payload.sectionId, {
        sectionName: payload.sectionName,
        classTeacherUuid: payload.classTeacherUuid,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mappings });
      toast.success('Class teacher assigned successfully.');
    },
    onError: () => {
      toast.error('Failed to assign class teacher.');
    },
  });
};

export const useRemoveClassTeacher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { sectionId: string; sectionName: string }) => {
      return academicsService.updateSection(payload.sectionId, {
        sectionName: payload.sectionName,
        classTeacherUuid: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mappings });
      toast.success('Class teacher unassigned successfully.');
    },
    onError: () => {
      toast.error('Failed to unassign class teacher.');
    },
  });
};
