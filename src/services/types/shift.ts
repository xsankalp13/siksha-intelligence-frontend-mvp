// -- Shift Management DTOs -------------------------------------------------

export interface ShiftCreateDTO {
  shiftName: string;
  startTime: string; // "HH:mm:ss" format (Java LocalTime serialization)
  endTime: string; // "HH:mm:ss" format
  graceMinutes: number;
  applicableDays: number[]; // 1=Monday ... 7=Sunday
  isDefault: boolean;
}

export interface ShiftResponseDTO {
  id: number;
  uuid: string;
  shiftName: string;
  startTime: string; // "HH:mm:ss" (Java LocalTime)
  endTime: string; // "HH:mm:ss"
  graceMinutes: number;
  applicableDays: number[];
  isDefault: boolean;
  active: boolean;
  createdAt: string; // ISO-8601 datetime
  updatedAt: string;
}

export interface StaffShiftMapRequestDTO {
  staffUuid: string;
  shiftUuid: string;
  effectiveFrom: string; // "yyyy-MM-dd"
}

export interface BulkStaffShiftMapRequestDTO {
  staffUuids: string[];
  shiftUuid: string;
  effectiveFrom: string;
}

// Backend DTO name: ShiftMappingResultDTO
export interface ShiftMappingResultDTO {
  success: number;
  failed: number;
  errors: string[];
}

export interface StaffShiftMappingResponseDTO {
  mappingId: number;
  uuid: string;
  staffUuid: string;
  staffName: string;
  employeeId: string;
  staffCategory: string;
  shiftUuid: string;
  shiftName: string;
  shiftStartTime: string; // "HH:mm:ss" (Java LocalTime)
  shiftEndTime: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  applicableDays?: number[];
}
