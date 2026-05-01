import { api } from "@/lib/axios";
import type {
  ControllerDashboardDTO,
  ControllerRoomViewDTO,
  ControllerClassViewDTO,
  DefaulterDecisionRequestDTO,
  DefaulterDecisionResponseDTO,
  ExamControllerAssignmentRequestDTO,
  ExamControllerAssignmentResponseDTO,
} from "./types/examController";

const PREFIX = "/auth/examination/exam-controller";

export const examControllerService = {
  assignController(data: ExamControllerAssignmentRequestDTO, signal?: AbortSignal) {
    return api.post<ExamControllerAssignmentResponseDTO>(`${PREFIX}/assignments`, data, { signal });
  },

  getDashboardSummary(examId: number, signal?: AbortSignal) {
    return api.get<ControllerDashboardDTO>(`${PREFIX}/dashboard`, {
      params: { examId },
      signal,
    });
  },

  getClassView(examId: number, signal?: AbortSignal) {
    return api.get<ControllerClassViewDTO>(`${PREFIX}/dashboard/class-view`, {
      params: { examId },
      signal,
    });
  },

  getRoomView(examId: number, signal?: AbortSignal) {
    return api.get<ControllerRoomViewDTO>(`${PREFIX}/dashboard/room-view`, {
      params: { examId },
      signal,
    });
  },

  submitDefaulterDecision(data: DefaulterDecisionRequestDTO, signal?: AbortSignal) {
    return api.post<DefaulterDecisionResponseDTO>(`${PREFIX}/defaulters/decision`, data, { signal });
  },
};
