// ── Invigilation & Seating Plan DTOs ─────────────────────────────────

// Invigilation
export type InvigilationRole = "PRIMARY" | "SECONDARY";

export interface InvigilationRequestDTO {
  examScheduleId: number;
  staffId: number;
  role: InvigilationRole;
}

export interface InvigilationResponseDTO {
  id: number;
  staffName: string;
  role: InvigilationRole;
  examScheduleId: number;
}

// Seating Plan
export interface SittingPlanRequestDTO {
  examScheduleId: number;
  studentId: number;
  roomId: string;
  seatNumber: string;
}

export interface SittingPlanResponseDTO {
  id: number;
  studentName: string;
  roomName: string;
  seatNumber: string;
  examScheduleId: number;
}
