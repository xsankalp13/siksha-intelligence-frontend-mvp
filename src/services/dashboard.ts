import { api } from "@/lib/axios";

export interface MasterAnalyticsResponseDTO {
  financePayrollTrend: Array<{
    month: string;
    expected: number;
    collected: number;
    payroll: number;
  }>;
  attendanceTrend: Array<{
    day: string;
    student: number;
    staff: number;
  }>;
  demographics: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export interface SystemEvent {
  id: string;
  type: 'finance' | 'attendance' | 'hrms' | 'system' | 'alert';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export const dashboardService = {
  /** GET /auth/dashboard/master-analytics */
  getMasterAnalytics() {
    return api.get<MasterAnalyticsResponseDTO>("/auth/dashboard/master-analytics");
  },
  
  /** GET /auth/dashboard/events */
  getEvents(params?: { page?: number; size?: number; since?: string; type?: string }) {
    return api.get<PageResponse<SystemEvent>>("/auth/dashboard/events", { params });
  },

  /** PATCH /auth/dashboard/events/read */
  markAsRead(eventIds: string[]) {
    return api.patch<void>("/auth/dashboard/events/read", eventIds);
  },

  /** GET /auth/dashboard/events/unread-count */
  getUnreadCount() {
    return api.get<{ unreadCount: number }>("/auth/dashboard/events/unread-count");
  }
};
