import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invigilationService } from "@/services/invigilation";
import type {
  InvigilationRequestDTO,
  SittingPlanRequestDTO,
} from "@/services/types/invigilation";

// ── Query Keys ──────────────────────────────────────────────────────
const keys = {
  invigilationsByExam: (examScheduleId: number) =>
    ["invigilation", "byExam", examScheduleId] as const,
  invigilationsByStaff: (staffId: number) =>
    ["invigilation", "byStaff", staffId] as const,
  seatingByExam: (examScheduleId: number) =>
    ["seating", "byExam", examScheduleId] as const,
  seatingByRoom: (roomId: string) =>
    ["seating", "byRoom", roomId] as const,
};

// ── Invigilation Queries ────────────────────────────────────────────

export const useGetInvigilationsByExam = (examScheduleId: number) =>
  useQuery({
    queryKey: keys.invigilationsByExam(examScheduleId),
    queryFn: async () =>
      (await invigilationService.getByExamSchedule(examScheduleId)).data,
    enabled: !!examScheduleId,
  });

export const useGetInvigilationsByStaff = (staffId: number) =>
  useQuery({
    queryKey: keys.invigilationsByStaff(staffId),
    queryFn: async () =>
      (await invigilationService.getByStaff(staffId)).data,
    enabled: !!staffId,
  });

// ── Invigilation Mutations ──────────────────────────────────────────

export const useAssignInvigilator = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InvigilationRequestDTO) =>
      invigilationService.assignInvigilator(data).then((r) => r.data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({
        queryKey: keys.invigilationsByExam(v.examScheduleId),
      }),
  });
};

export const useRemoveInvigilator = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, examScheduleId: _eid }: { id: number; examScheduleId: number }) =>
      invigilationService.removeInvigilator(id),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({
        queryKey: keys.invigilationsByExam(v.examScheduleId),
      }),
  });
};

// ── Seating Queries ─────────────────────────────────────────────────

export const useGetSeatingByExam = (examScheduleId: number) =>
  useQuery({
    queryKey: keys.seatingByExam(examScheduleId),
    queryFn: async () =>
      (await invigilationService.getSeatingByExam(examScheduleId)).data,
    enabled: !!examScheduleId,
  });

export const useGetSeatingByRoom = (roomId: string) =>
  useQuery({
    queryKey: keys.seatingByRoom(roomId),
    queryFn: async () =>
      (await invigilationService.getSeatingByRoom(roomId)).data,
    enabled: !!roomId,
  });

// ── Seating Mutations ───────────────────────────────────────────────

export const useAssignSeat = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SittingPlanRequestDTO) =>
      invigilationService.assignSeat(data).then((r) => r.data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({
        queryKey: keys.seatingByExam(v.examScheduleId),
      }),
  });
};

export const useRemoveSeat = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, examScheduleId: _eid }: { id: number; examScheduleId: number }) =>
      invigilationService.removeSeat(id),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({
        queryKey: keys.seatingByExam(v.examScheduleId),
      }),
  });
};
