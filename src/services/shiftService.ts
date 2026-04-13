import { api } from "@/lib/axios";
import type { PageResponse } from "./types/common";
import type {
  ShiftCreateDTO,
  ShiftResponseDTO,
  StaffShiftMapRequestDTO,
  BulkStaffShiftMapRequestDTO,
  ShiftMappingResultDTO,
  StaffShiftMappingResponseDTO,
} from "./types/shift";

const AMS = "/auth/ams";

export const shiftService = {
  /** GET /auth/ams/shifts — returns flat array (NOT paginated) */
  listShifts() {
    return api.get<ShiftResponseDTO[]>(`${AMS}/shifts`);
  },

  /** POST /auth/ams/shifts */
  createShift(data: ShiftCreateDTO) {
    return api.post<ShiftResponseDTO>(`${AMS}/shifts`, data);
  },

  /** GET /auth/ams/shifts/{shiftUuid} */
  getShift(shiftUuid: string) {
    return api.get<ShiftResponseDTO>(`${AMS}/shifts/${shiftUuid}`);
  },

  /** PUT /auth/ams/shifts/{shiftUuid} */
  updateShift(shiftUuid: string, data: ShiftCreateDTO) {
    return api.put<ShiftResponseDTO>(`${AMS}/shifts/${shiftUuid}`, data);
  },

  /** DELETE /auth/ams/shifts/{shiftUuid} — soft delete, 204 No Content */
  deleteShift(shiftUuid: string) {
    return api.delete(`${AMS}/shifts/${shiftUuid}`);
  },

  /** POST /auth/ams/shifts/map */
  mapStaffToShift(data: StaffShiftMapRequestDTO) {
    return api.post<ShiftMappingResultDTO>(`${AMS}/shifts/map`, data);
  },

  /** POST /auth/ams/shifts/map/bulk */
  bulkMapStaffToShift(data: BulkStaffShiftMapRequestDTO) {
    return api.post<ShiftMappingResultDTO>(`${AMS}/shifts/map/bulk`, data);
  },

  /** GET /auth/ams/shifts/mappings — paginated */
  listShiftMappings(params?: {
    page?: number;
    size?: number;
    sort?: string;
    shiftUuid?: string;
    staffCategory?: string;
  }) {
    return api.get<PageResponse<StaffShiftMappingResponseDTO>>(`${AMS}/shifts/mappings`, {
      params,
    });
  },

  /** GET /auth/ams/shifts/mappings/staff/{staffUuid} */
  getStaffShiftMapping(staffUuid: string) {
    return api.get<StaffShiftMappingResponseDTO>(`${AMS}/shifts/mappings/staff/${staffUuid}`);
  },

  /** DELETE /auth/ams/shifts/mappings/{mappingUuid} */
  removeShiftMapping(mappingUuid: string) {
    return api.delete(`${AMS}/shifts/mappings/${mappingUuid}`);
  },
};
