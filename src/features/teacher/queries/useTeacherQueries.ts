import { useQuery } from "@tanstack/react-query";
import { teacherService } from "@/services/teacherService";

export const teacherKeys = {
  all: ["teacher"] as const,
  classes: () => [...teacherKeys.all, "classes"] as const,
  ctClasses: () => [...teacherKeys.all, "ct-classes"] as const,
  students: (filters?: {
    classUuid?: string;
    sectionUuid?: string;
    search?: string;
    page?: number;
    size?: number;
  }) => [...teacherKeys.all, "students", filters ?? {}] as const,
  ctStudents: (filters?: {
    sectionUuid?: string;
    search?: string;
    page?: number;
    size?: number;
  }) => [...teacherKeys.all, "ct-students", filters ?? {}] as const,
  schedule: (date?: string) => [...teacherKeys.all, "schedule", date ?? "today"] as const,
  summary: (date?: string) => [...teacherKeys.all, "summary", date ?? "today"] as const,
  homeroom: (date?: string) => [...teacherKeys.all, "homeroom", date ?? "today"] as const,
};

const baseOptions = {
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  refetchOnWindowFocus: false,
  retry: 2,
} as const;

export function useTeacherClasses() {
  return useQuery({
    queryKey: teacherKeys.classes(),
    queryFn: async () => (await teacherService.getMyClasses()).data,
    ...baseOptions,
  });
}

export function useTeacherCtClasses() {
  return useQuery({
    queryKey: teacherKeys.ctClasses(),
    queryFn: async () => (await teacherService.getMyClassTeacherSections()).data,
    ...baseOptions,
  });
}

export function useTeacherStudents(filters?: {
  classUuid?: string;
  sectionUuid?: string;
  search?: string;
  page?: number;
  size?: number;
}, enabled = true) {
  return useQuery({
    queryKey: teacherKeys.students(filters),
    queryFn: async () => {
      const res = await teacherService.getMyStudents(filters);
      return res.data;
    },
    enabled,
    ...baseOptions,
  });
}

export function useTeacherCtStudents(filters?: {
  sectionUuid?: string;
  search?: string;
  page?: number;
  size?: number;
}, enabled = true) {
  return useQuery({
    queryKey: teacherKeys.ctStudents(filters),
    queryFn: async () => {
      const res = await teacherService.getClassTeacherStudents(filters);
      return res.data;
    },
    enabled,
    ...baseOptions,
  });
}

export function useTeacherSchedule(date?: string, enabled = true) {
  return useQuery({
    queryKey: teacherKeys.schedule(date),
    queryFn: async () => (await teacherService.getMySchedule(date)).data,
    enabled,
    ...baseOptions,
  });
}

export function useTeacherDashboardSummary(date?: string, enabled = true) {
  return useQuery({
    queryKey: teacherKeys.summary(date),
    queryFn: async () => (await teacherService.getDashboardSummary(date)).data,
    enabled,
    ...baseOptions,
  });
}

export function useTeacherHomeroom(date?: string, enabled = true) {
  return useQuery({
    queryKey: teacherKeys.homeroom(date),
    queryFn: async () => (await teacherService.getMyHomeroom(date)).data,
    enabled,
    ...baseOptions,
  });
}
