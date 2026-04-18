import { useQuery } from '@tanstack/react-query';
import { parentService } from '@/services/parentService';
import { useChildStore } from '../stores/useChildStore';

export const parentKeys = {
  all: ['parent'] as const,
  children: () => [...parentKeys.all, 'children'] as const,
  dashboard: (childId: string) => [...parentKeys.all, 'dashboard', childId] as const,
  academics: (childId: string) => [...parentKeys.all, 'academics', childId] as const,
  attendance: (childId: string) => [...parentKeys.all, 'attendance', childId] as const,
  homework: (childId: string) => [...parentKeys.all, 'homework', childId] as const,
  fees: (childId: string) => [...parentKeys.all, 'fees', childId] as const,
};

const baseOptions = {
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  refetchOnWindowFocus: false,
  retry: 2,
} as const;

export function useParentChildren() {
  return useQuery({
    queryKey: parentKeys.children(),
    queryFn: async () => {
      const res = await parentService.getMyChildren();
      return res.data;
    },
    ...baseOptions,
  });
}

export function useParentDashboard() {
  const { selectedChildId } = useChildStore();
  
  return useQuery({
    // Only fire if we have a childId
    queryKey: selectedChildId ? parentKeys.dashboard(selectedChildId) : [...parentKeys.all, 'dashboard', 'none'],
    queryFn: async () => {
      if (!selectedChildId) throw new Error("No child selected");
      const res = await parentService.getDashboardSummary(selectedChildId);
      return res.data;
    },
    enabled: !!selectedChildId,
    ...baseOptions,
  });
}

export function useChildAcademics() {
  const { selectedChildId } = useChildStore();
  return useQuery({
    queryKey: selectedChildId ? parentKeys.academics(selectedChildId) : [...parentKeys.all, 'academics', 'none'],
    queryFn: async () => {
      if (!selectedChildId) throw new Error("No child selected");
      const res = await parentService.getAcademics(selectedChildId);
      return res.data;
    },
    enabled: !!selectedChildId,
    ...baseOptions,
  });
}

export function useChildAttendance() {
  const { selectedChildId } = useChildStore();
  return useQuery({
    queryKey: selectedChildId ? parentKeys.attendance(selectedChildId) : [...parentKeys.all, 'attendance', 'none'],
    queryFn: async () => {
      if (!selectedChildId) throw new Error("No child selected");
      const res = await parentService.getAttendance(selectedChildId);
      return res.data;
    },
    enabled: !!selectedChildId,
    ...baseOptions,
  });
}

export function useChildHomework() {
  const { selectedChildId } = useChildStore();
  return useQuery({
    queryKey: selectedChildId ? parentKeys.homework(selectedChildId) : [...parentKeys.all, 'homework', 'none'],
    queryFn: async () => {
      if (!selectedChildId) throw new Error("No child selected");
      const res = await parentService.getHomework(selectedChildId);
      return res.data;
    },
    enabled: !!selectedChildId,
    ...baseOptions,
  });
}

export function useChildFees() {
  const { selectedChildId } = useChildStore();
  return useQuery({
    queryKey: selectedChildId ? parentKeys.fees(selectedChildId) : [...parentKeys.all, 'fees', 'none'],
    queryFn: async () => {
      if (!selectedChildId) throw new Error("No child selected");
      const res = await parentService.getFees(selectedChildId);
      return res.data;
    },
    enabled: !!selectedChildId,
    ...baseOptions,
  });
}
