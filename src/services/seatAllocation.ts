import { api } from "@/lib/axios";
import type {
  RoomAvailabilityDTO,
  SeatAvailabilityDTO,
  SeatAllocationResponseDTO,
  SingleSeatAllocationRequestDTO,
  BulkSeatAllocationRequestDTO,
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
};
