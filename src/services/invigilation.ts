import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { getApiAccessToken } from "@/lib/axios";
import type {
  InvigilationRequestDTO,
  InvigilationResponseDTO,
  SittingPlanRequestDTO,
  SittingPlanResponseDTO,
} from "./types/invigilation";

// ── Raw Axios instance ──────────────────────────────────────────────
// The invigilation & sitting-plan endpoints sit at the server root
// (e.g. /invigilations, /sitting-plans) instead of the usual /api/v1/auth prefix.
const rawBaseURL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080").replace(/\/+$/, "");

const rawApi = axios.create({
  baseURL: rawBaseURL,
  withCredentials: true,
});

// Attach JWT token from the main auth state
rawApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getApiAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Multi-tenancy
  const hostname = window.location.hostname;
  const parts = hostname.split(":")[0].split(".").filter(Boolean);
  let tenantId: string | null = null;
  if (parts.length >= 3) tenantId = parts[0];
  else if (parts.length === 2 && parts[1] === "localhost") tenantId = parts[0];
  if (tenantId) {
    config.headers = config.headers ?? {};
    config.headers["X-Tenant-ID"] = tenantId;
  }

  return config;
});

// ── Invigilation Service ────────────────────────────────────────────

export const invigilationService = {
  // ── Invigilator Assignments ─────────────────────────────────────

  /** POST /invigilations — assign an invigilator to an exam schedule */
  assignInvigilator(data: InvigilationRequestDTO) {
    return rawApi.post<InvigilationResponseDTO>("/invigilations", data);
  },

  /** GET /invigilations/exam/:examScheduleId — list invigilators for a schedule */
  getByExamSchedule(examScheduleId: number) {
    return rawApi.get<InvigilationResponseDTO[]>(
      `/invigilations/exam/${examScheduleId}`
    );
  },

  /** GET /invigilations/staff/:staffId — list assignments for a staff member */
  getByStaff(staffId: number) {
    return rawApi.get<InvigilationResponseDTO[]>(
      `/invigilations/staff/${staffId}`
    );
  },

  /** DELETE /invigilations/:id — remove an invigilator assignment */
  removeInvigilator(id: number) {
    return rawApi.delete(`/invigilations/${id}`);
  },

  // ── Seating Plan ────────────────────────────────────────────────

  /** POST /sitting-plans — assign a student to a seat */
  assignSeat(data: SittingPlanRequestDTO) {
    return rawApi.post<SittingPlanResponseDTO>("/sitting-plans", data);
  },

  /** GET /sitting-plans/exam/:examScheduleId — list seating for a schedule */
  getSeatingByExam(examScheduleId: number) {
    return rawApi.get<SittingPlanResponseDTO[]>(
      `/sitting-plans/exam/${examScheduleId}`
    );
  },

  /** GET /sitting-plans/room/:roomId — list seating for a room */
  getSeatingByRoom(roomId: string) {
    return rawApi.get<SittingPlanResponseDTO[]>(
      `/sitting-plans/room/${roomId}`
    );
  },

  /** DELETE /sitting-plans/:id — remove a seat assignment */
  removeSeat(id: number) {
    return rawApi.delete(`/sitting-plans/${id}`);
  },
};
