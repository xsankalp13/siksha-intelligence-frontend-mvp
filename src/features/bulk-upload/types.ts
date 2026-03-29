// ── Parsed Excel / CSV data (client-side preview) ────────────────────
export interface ParsedSheetData {
  /** Column header names extracted from the first row */
  headers: string[];
  /** Two-dimensional array of cell values (string-coerced) */
  rows: string[][];
}

// ── Backend response for bulk import ─────────────────────────────────
export interface BulkImportReportDTO {
  status: string;
  totalRows: number;
  successCount: number;
  failureCount: number;
  errorMessages: string[];
  // Guardian-specific (students-with-guardians endpoint only)
  guardiansCreated?: number;
  guardiansLinked?: number;
}

// ── SSE event payloads for students-with-guardians endpoint ──────────
export interface SseRowSuccessPayload {
  rowNumber: number;
  identifier: string;
  userType?: string;
  studentEnrollmentNumber?: string;
  guardianUsernames?: string[];
  guardiansCreated?: number;
  guardiansLinked?: number;
}

export interface SseRowFailurePayload {
  rowNumber: number;
  identifier: string;
  errorMessage: string;
  userType?: string;
  studentEnrollmentNumber?: string;
}

export interface SseJobCompletePayload {
  successCount: number;
  failureCount: number;
  totalRows: number;
  guardiansCreated?: number;
  guardiansLinked?: number;
}

// ── User type for bulk import ────────────────────────────────────────
// These values must match the backend path parameter exactly:
//   POST /api/v1/auth/bulk-import/{userType}
//   Backend accepts: "students" | "staff"
export type BulkImportUserType = "students" | "staff";

/** Mode of bulk import — single file (legacy) vs dual-file students+guardians */
export type BulkImportMode = "single" | "students-with-guardians";

export const USER_TYPE_OPTIONS: { value: BulkImportUserType; label: string }[] = [
  { value: "students", label: "Students" },
  { value: "staff", label: "Staff" },
];

// ── State machine for the upload flow ────────────────────────────────
export type UploadPhase =
  | "idle"
  | "processing"
  | "preview"
  | "uploading"
  | "success"
  | "error";

export interface BulkUploadState {
  phase: UploadPhase;
  /** The raw file reference (kept for upload & display purposes) */
  file: File | null;
  /** Parsed spreadsheet data available after processing (client-side preview only) */
  data: ParsedSheetData | null;
  /** Human-readable error message */
  errorMessage: string | null;
  /** Backend report after successful upload */
  report: BulkImportReportDTO | null;
}

// ── Component props ──────────────────────────────────────────────────
export interface FileDropzoneProps {
  onFileAccepted: (file: File) => void;
  disabled?: boolean;
}

export interface DataPreviewTableProps {
  data: ParsedSheetData;
}

export interface TableShimmerProps {
  /** Number of skeleton rows to render (default 8) */
  rows?: number;
  /** Number of skeleton columns to render (default 5) */
  columns?: number;
}
