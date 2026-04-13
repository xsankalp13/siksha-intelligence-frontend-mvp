// ── Invigilation & Seating Plan DTOs ─────────────────────────────────

// Invigilation
export type InvigilationRole = "PRIMARY" | "SECONDARY";

export interface InvigilationRequestDTO {
  examScheduleId: number;
  staffId: string;
  roomId: string;
  role: InvigilationRole;
}

export interface InvigilationResponseDTO {
  id: number;
  staffName: string;
  role: InvigilationRole;
  examScheduleId: number;
  roomUuid: string;
  roomName: string;
}

// Seating Plan
export interface SittingPlanRequestDTO {
  examScheduleId: number;
  studentId: string;
  roomId: string;
  seatNumber: string;
}

export interface AutoAllocationRequestDTO {
  examScheduleId: number;
  roomId: string; // UUID
  seatPrefix?: string;
  startNumber?: number;
}

export interface SittingPlanResponseDTO {
  id: number;
  studentName: string;
  roomName: string;
  seatNumber: string;
  examScheduleId: number;
}
