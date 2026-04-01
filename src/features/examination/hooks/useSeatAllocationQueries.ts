import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { seatAllocationService } from "@/services/seatAllocation";
import type {
  SingleSeatAllocationRequestDTO,
  BulkSeatAllocationRequestDTO,
} from "@/services/types/seatAllocation";

// ── Query Keys ──────────────────────────────────────────────────────
const keys = {
  allocationsByExam: (examScheduleId: number) =>
    ["seatAllocation", "byExam", examScheduleId] as const,
  availableRooms: (examScheduleId: number) =>
    ["seatAllocation", "rooms", examScheduleId] as const,
  seatGrid: (roomUuid: string, examScheduleId: number) =>
    ["seatAllocation", "grid", roomUuid, examScheduleId] as const,
};

// ── Queries ─────────────────────────────────────────────────────────

export const useGetAllocationsForSchedule = (examScheduleId: number) =>
  useQuery({
    queryKey: keys.allocationsByExam(examScheduleId),
    queryFn: async () =>
      (await seatAllocationService.getAllocationsForSchedule(examScheduleId)).data,
    enabled: !!examScheduleId,
  });

export const useGetAvailableRooms = (examScheduleId: number) =>
  useQuery({
    queryKey: keys.availableRooms(examScheduleId),
    queryFn: async () =>
      (await seatAllocationService.getAvailableRooms(examScheduleId)).data,
    enabled: !!examScheduleId,
  });

export const useGetSeatGrid = (roomUuid: string, examScheduleId: number) =>
  useQuery({
    queryKey: keys.seatGrid(roomUuid, examScheduleId),
    queryFn: async () =>
      (await seatAllocationService.getSeatGrid(roomUuid, examScheduleId)).data,
    enabled: !!roomUuid && !!examScheduleId,
  });

// ── Mutations ───────────────────────────────────────────────────────

export const useAllocateSingleSeat = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SingleSeatAllocationRequestDTO) =>
      seatAllocationService.allocateSingleSeat(data).then((r) => r.data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({
        queryKey: keys.allocationsByExam(v.examScheduleId),
      });
      qc.invalidateQueries({
        queryKey: keys.seatGrid(v.roomId, v.examScheduleId),
      });
      qc.invalidateQueries({
        queryKey: keys.availableRooms(v.examScheduleId),
      });
    },
  });
};

export const useAutoAllocateSeatsBulk = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkSeatAllocationRequestDTO) =>
      seatAllocationService.autoAllocate(data).then((r) => r.data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({
        queryKey: keys.allocationsByExam(v.examScheduleId),
      });
      qc.invalidateQueries({
        queryKey: keys.availableRooms(v.examScheduleId),
      });
    },
  });
};

export const useRemoveAllocation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, examScheduleId: _eid }: { id: number; examScheduleId: number }) =>
      seatAllocationService.removeAllocation(id),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({
        queryKey: keys.allocationsByExam(v.examScheduleId),
      });
      qc.invalidateQueries({
        queryKey: keys.availableRooms(v.examScheduleId),
      });
    },
  });
};

export const useBulkRemoveAllocations = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, examScheduleId: _eid }: { ids: number[]; examScheduleId: number }) =>
      seatAllocationService.bulkRemoveAllocations(ids),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({
        queryKey: keys.allocationsByExam(v.examScheduleId),
      });
      qc.invalidateQueries({
        queryKey: keys.availableRooms(v.examScheduleId),
      });
    },
  });
};
