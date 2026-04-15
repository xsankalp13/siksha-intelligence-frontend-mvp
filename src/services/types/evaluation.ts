// ── Answer Evaluation DTOs ──────────────────────────────────────────
// Aligned with backend: EvaluationAssignment, AnswerSheet, EvaluationResult, QuestionMark, Annotation

// ── Enums ───────────────────────────────────────────────────────────

export type EvaluationAssignmentStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED";

export type EvaluationAssignmentRole = "UPLOADER" | "EVALUATOR";

export type UploadStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export type AnswerSheetStatus = "UPLOADED" | "COMPLETE" | "CHECKING" | "DRAFT" | "FINAL";

export type EvaluationResultStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "PUBLISHED"
  | "REJECTED";

export type AnnotationType = "TICK" | "CROSS" | "DRAW" | "NONE";

// ── Admin DTOs ─────────────────────────────────────────────────────

export interface EvaluationAssignmentCreateRequestDTO {
  examScheduleId: number;
  teacherId: string; // UUID
  dueDate?: string;  // ISO date
  role?: EvaluationAssignmentRole; // defaults to EVALUATOR if omitted
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
  role: EvaluationAssignmentRole;
  status: EvaluationAssignmentStatus;
  uploadStatus: UploadStatus | null;
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
  resultId: number;
  answerSheetId: number;
  totalMarks: number;
  status: EvaluationResultStatus;
  evaluatedAt: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  approvedBy: string | null;
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

// ── Admin Result Review DTOs ────────────────────────────────────────

export interface AdminResultReviewResponseDTO {
  resultId: number;
  answerSheetId: number;
  scheduleId: number;
  studentId: string;    // UUID
  studentName: string;
  enrollmentNumber: string;
  examId: string;
  examName: string;
  classId: string;
  className: string;
  subjectName: string;
  totalMarks: number;
  status: EvaluationResultStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  approvedBy: string | null;
}

// ── Student Result DTOs ─────────────────────────────────────────────

export interface StudentResultResponseDTO {
  resultId: number;
  scheduleId: number;
  examName: string;
  subjectName: string;
  marksObtained: number;
  maxMarks: number;
  publishedAt: string;
}

export interface StudentResultDetailResponseDTO {
  resultId: number;
  scheduleId: number;
  examName: string;
  subjectName: string;
  examDate: string;
  totalMarks: number;
  maxMarks: number;
  publishedAt: string;
  subjectMarks: SubjectMarkDTO[];
}

export interface SubjectMarkDTO {
  subjectName: string;
  marksObtained: number;
  maxMarks: number;
}

export interface ClassResultSummaryResponseDTO {
  classId: string;
  className: string;
  examId: string;
  examName: string;
  totalStudents: number;
  evaluatedStudents: number;
  absentStudents: number;
  pendingStudents: number;
  status: 'INCOMPLETE' | 'READY_FOR_APPROVAL' | 'APPROVED' | 'PUBLISHED';
}
