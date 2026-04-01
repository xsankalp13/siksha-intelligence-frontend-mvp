import { api } from "@/lib/axios";
import type {
  InvigilationRequestDTO,
  InvigilationResponseDTO,
  SittingPlanRequestDTO,
  SittingPlanResponseDTO,
} from "./types/invigilation";

// ── Invigilation Service ────────────────────────────────────────────

export const invigilationService = {
  // ── Invigilator Assignments ─────────────────────────────────────

  /** POST /auth/examination/invigilations — assign an invigilator to an exam schedule */
  assignInvigilator(data: InvigilationRequestDTO) {
    return api.post<InvigilationResponseDTO>("/auth/examination/invigilations", data);
  },

  /** GET /auth/examination/invigilations/exam/:examScheduleId — list invigilators for a schedule */
  getByExamSchedule(examScheduleId: number) {
    return api.get<InvigilationResponseDTO[]>(
      `/auth/examination/invigilations/exam/${examScheduleId}`
    );
  },

  /** GET /auth/examination/invigilations/staff/:staffId — list assignments for a staff member */
  getByStaff(staffId: number) {
    return api.get<InvigilationResponseDTO[]>(
      `/auth/examination/invigilations/staff/${staffId}`
    );
  },

  /** DELETE /auth/examination/invigilations/:id — remove an invigilator assignment */
  removeInvigilator(id: number) {
    return api.delete(`/auth/examination/invigilations/${id}`);
  },

  // ── Seating Plan ────────────────────────────────────────────────

  /** POST /auth/examination/sitting-plans — assign a student to a seat */
  assignSeat(data: SittingPlanRequestDTO) {
    return api.post<SittingPlanResponseDTO>("/auth/examination/sitting-plans", data);
  },

  /** GET /auth/examination/sitting-plans/exam/:examScheduleId — list seating for a schedule */
  getSeatingByExam(examScheduleId: number) {
    return api.get<SittingPlanResponseDTO[]>(
      `/auth/examination/sitting-plans/exam/${examScheduleId}`
    );
  },

  /** GET /auth/examination/sitting-plans/room/:roomId — list seating for a room */
  getSeatingByRoom(roomId: string) {
    return api.get<SittingPlanResponseDTO[]>(
      `/auth/examination/sitting-plans/room/${roomId}`
    );
  },

  /** DELETE /auth/examination/sitting-plans/:id — remove a seat assignment */
  removeSeat(id: number) {
    return api.delete(`/auth/examination/sitting-plans/${id}`);
  },
};
