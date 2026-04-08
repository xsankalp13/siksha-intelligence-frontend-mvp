// ── Answer Evaluation DTOs ──────────────────────────────────────────
// Aligned with backend: EvaluationAssignment, AnswerSheet, EvaluationResult, QuestionMark, Annotation

// ── Enums ───────────────────────────────────────────────────────────

export type EvaluationAssignmentStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED";

export type AnswerSheetStatus = "UPLOADED" | "COMPLETE" | "CHECKING" | "DRAFT" | "FINAL";

export type EvaluationResultStatus = "DRAFT" | "FINAL";

export type AnnotationType = "TICK" | "CROSS" | "DRAW" | "NONE";

// ── Admin DTOs ─────────────────────────────────────────────────────

export interface EvaluationAssignmentCreateRequestDTO {
  examScheduleId: number;
  teacherId: string; // UUID
  dueDate?: string;  // ISO date
}

export interface EvaluationAssignmentResponseDTO {
  assignmentId: number;
  examScheduleId: number;
  examUuid: string;
  examName: string;
  subjectName: string;
  examDate: string;
  teacherId: string;   // UUID
  teacherName: string;
  status: EvaluationAssignmentStatus;
  assignedAt: string;
  dueDate: string | null;
}

// ── Teacher DTOs ────────────────────────────────────────────────────

export interface TeacherEvaluationStudentResponseDTO {
  studentId: string;   // UUID
  studentName: string;
  enrollmentNumber: string;
  answerSheetId: number | null;
  answerSheetStatus: AnswerSheetStatus | null;
}

export interface AnswerSheetUploadResponseDTO {
  answerSheetId: number;
  fileUrl: string;
  status: AnswerSheetStatus;
  createdAt: string;
}

// ── Image Upload DTOs ───────────────────────────────────────────────

export interface AnswerSheetImagePageResponseDTO {
  pageNumber: number;
  imageUrl: string;
}

export interface AnswerSheetImageGroupResponseDTO {
  answerSheetId: number;
  studentId: string;          // UUID
  examScheduleId: number;
  status: AnswerSheetStatus;
  updatedAt: string | null;
  pages: AnswerSheetImagePageResponseDTO[];
}

// ── Evaluation Structure DTOs ───────────────────────────────────────

export interface EvaluationQuestionDTO {
  questionNumber: number;
  maxMarks: number;
  marksObtained: number | null;
  annotationType: AnnotationType;
}

export interface EvaluationSectionDTO {
  sectionName: string;
  questions: EvaluationQuestionDTO[];
}

export interface AnswerEvaluationStructureResponseDTO {
  answerSheetId: number;
  totalQuestions: number;
  totalMaxMarks: number;
  resultStatus: string;
  sections: EvaluationSectionDTO[];
}

// ── Marks DTOs ──────────────────────────────────────────────────────

export interface SaveQuestionMarkRequestDTO {
  sectionName: string;
  questionNumber: number;
  marksObtained: number;
  annotationType?: AnnotationType;
}

export interface SaveEvaluationMarksRequestDTO {
  questionMarks: SaveQuestionMarkRequestDTO[];
}

export interface EvaluationResultResponseDTO {
  answerSheetId: number;
  totalMarks: number;
  status: string;
  evaluatedAt: string | null;
}

// ── Annotation DTOs ─────────────────────────────────────────────────

export interface AnnotationRequestDTO {
  pageNumber: number;
  x: number;
  y: number;
  type: AnnotationType;
  metadata?: Record<string, unknown>;
}

export interface AnnotationResponseDTO {
  id: number;
  pageNumber: number;
  x: number;
  y: number;
  type: AnnotationType;
  metadata: Record<string, unknown> | null;
}
