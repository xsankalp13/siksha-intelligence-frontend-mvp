import { api } from "@/lib/axios";
import type {
  RoomAvailabilityDTO,
  SeatAvailabilityDTO,
  SeatAllocationResponseDTO,
  SingleSeatAllocationRequestDTO,
  BulkSeatAllocationRequestDTO,
  GlobalSeatAllocationRequestDTO,
  GlobalSeatAllocationResultDTO,
  GlobalCapacityInfoDTO,
} from "./types/seatAllocation";

export const seatAllocationService = {
  // ── Seating Allocation V2 ────────────────────────────────────────────────

  /** GET /auth/examination/seat-allocation/rooms — Get available rooms */
  getAvailableRooms(examScheduleId: number) {
    return api.get<RoomAvailabilityDTO[]>(
      `/auth/examination/seat-allocation/rooms`,
      { params: { examScheduleId } }
    );
  },

  /** GET /auth/examination/seat-allocation/rooms/:roomUuid/seats — Get seat grid */
  getSeatGrid(roomUuid: string, examScheduleId: number) {
    return api.get<SeatAvailabilityDTO[]>(
      `/auth/examination/seat-allocation/rooms/${roomUuid}/seats`,
      { params: { examScheduleId } }
    );
  },

  /** POST /auth/examination/seat-allocation/rooms/seats/bulk — Get multiple seat grids */
  getBulkSeatGrids(roomUuids: string[], examScheduleId: number) {
    return api.post<Record<string, SeatAvailabilityDTO[]>>(
      `/auth/examination/seat-allocation/rooms/seats/bulk`,
      roomUuids,
      { params: { examScheduleId } }
    );
  },

  /** POST /auth/examination/seat-allocation/allocate — Manual assign */
  allocateSingleSeat(data: SingleSeatAllocationRequestDTO) {
    return api.post<SeatAllocationResponseDTO>(
      `/auth/examination/seat-allocation/allocate`,
      data
    );
  },

  /** POST /auth/examination/seat-allocation/auto-allocate — Auto assign bulk */
  autoAllocate(data: BulkSeatAllocationRequestDTO) {
    return api.post<SeatAllocationResponseDTO[]>(
      `/auth/examination/seat-allocation/auto-allocate`,
      data
    );
  },

  /** POST /auth/examination/seat-allocation/global-allocate — Global auto assign */
  globalAllocate(data: GlobalSeatAllocationRequestDTO) {
    return api.post<GlobalSeatAllocationResultDTO>(
      `/auth/examination/seat-allocation/global-allocate`,
      data
    );
  },

  /** GET /auth/examination/seat-allocation/global-capacity-info — Global capacity */
  getGlobalCapacityInfo(examUuid: string) {
    return api.get<GlobalCapacityInfoDTO>(
      `/auth/examination/seat-allocation/global-capacity-info`,
      { params: { examUuid } }
    );
  },

  /** GET /public/examination/seat-allocation/global-print/:examUuid — Get Global PDF URL */
  getGlobalSeatingPlanPdfUrl(examUuid: string) {
    return `${api.defaults.baseURL}/public/examination/seat-allocation/global-print/${examUuid}`;
  },

  /** GET /auth/examination/seat-allocation/schedule/:id — Get all for schedule */
  getAllocationsForSchedule(examScheduleId: number) {
    return api.get<SeatAllocationResponseDTO[]>(
      `/auth/examination/seat-allocation/schedule/${examScheduleId}`
    );
  },

  /** DELETE /auth/examination/seat-allocation/:id — Remove a seat allocation */
  removeAllocation(id: number) {
    return api.delete(`/auth/examination/seat-allocation/${id}`);
  },

  /** DELETE /auth/examination/seat-allocation/bulk — Remove bulk seat allocations */
  bulkRemoveAllocations(ids: number[]) {
    return api.delete("/auth/examination/seat-allocation/bulk", { data: ids });
  },

  /** DELETE /auth/examination/seat-allocation/exam/:examUuid — Clear all for exam */
  clearAllocationsByExam(examUuid: string) {
    return api.delete(`/auth/examination/seat-allocation/exam/${examUuid}`);
  },

  /** DELETE /auth/examination/seat-allocation/schedule/:scheduleId — Clear for schedule */
  clearAllocationsBySchedule(scheduleId: number) {
    return api.delete(`/auth/examination/seat-allocation/schedule/${scheduleId}`);
  },
};
