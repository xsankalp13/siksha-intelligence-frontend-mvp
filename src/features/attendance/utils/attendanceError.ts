import type { AxiosError } from "axios";
import { toast } from "sonner";

interface EditWindowErrorResponse {
  error: "EDIT_WINDOW_EXPIRED";
  message: string;
  attendanceDate: string;
  windowHours: number;
  expiredAt: string;
  path: string;
  timestamp: string;
}

interface AttendanceProcessingErrorResponse {
  statusCode: number;
  message: string;
  path: string;
  timestamp: string;
}

type AttendanceErrorResponse = EditWindowErrorResponse | AttendanceProcessingErrorResponse;

export function getAttendanceErrorMessage(
  error: unknown,
  fallback = "Failed to update attendance",
): string {
  const axiosErr = error as AxiosError<AttendanceErrorResponse>;
  const data = axiosErr?.response?.data;

  if (!data) {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  }

  if ("error" in data && data.error === "EDIT_WINDOW_EXPIRED") {
    return `Edit window expired for ${data.attendanceDate}. Window: ${data.windowHours}h. Contact your School Admin.`;
  }

  if (typeof data.message === "string" && data.message.startsWith("GEO_FENCE_VIOLATION:")) {
    return data.message.replace("GEO_FENCE_VIOLATION: ", "");
  }

  if (typeof data.message === "string" && data.message.trim().length > 0) {
    return data.message;
  }

  return fallback;
}

export function handleAttendanceError(error: unknown, fallback = "Failed to update attendance"): void {
  toast.error(getAttendanceErrorMessage(error, fallback));
}
