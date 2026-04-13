import { api } from "@/lib/axios";
import type { PageResponse } from "./types/common";
import type {
  EvaluationAssignmentCreateRequestDTO,
  EvaluationAssignmentResponseDTO,
  TeacherEvaluationStudentResponseDTO,
  AnswerSheetUploadResponseDTO,
  AnswerSheetImageGroupResponseDTO,
  AnswerEvaluationStructureResponseDTO,
  SaveEvaluationMarksRequestDTO,
  EvaluationResultResponseDTO,
  AnnotationRequestDTO,
  AnnotationResponseDTO,
  AdminResultReviewResponseDTO,
  StudentResultResponseDTO,
  StudentResultDetailResponseDTO,
  EvaluationResultStatus,
  ClassResultSummaryResponseDTO,
} from "./types/evaluation";

// ── Evaluation Service ──────────────────────────────────────────────

export const evaluationService = {
  // ── Admin APIs ──────────────────────────────────────────────────────

  /** POST /auth/examination/evaluation/assign */
  assignTeacher(data: EvaluationAssignmentCreateRequestDTO) {
    return api.post<EvaluationAssignmentResponseDTO>(
      "/auth/examination/evaluation/assign",
      data
    );
  },

  /** GET /auth/examination/evaluation/assignments */
  getAssignments(teacherId?: string) {
    return api.get<EvaluationAssignmentResponseDTO[]>(
      "/auth/examination/evaluation/assignments",
      { params: teacherId ? { teacherId } : undefined }
    );
  },

  // ── Teacher APIs ────────────────────────────────────────────────────

  /** GET /teacher/evaluation/assignments */
  getMyAssignments() {
    return api.get<EvaluationAssignmentResponseDTO[]>(
      "/teacher/evaluation/assignments"
    );
  },

  /** GET /teacher/evaluation/{scheduleId}/students */
  getStudentsForSchedule(scheduleId: number) {
    return api.get<TeacherEvaluationStudentResponseDTO[]>(
      `/teacher/evaluation/${scheduleId}/students`
    );
  },

  /** POST /teacher/answer-sheets/upload (multipart/form-data — single PDF) */
  uploadAnswerSheet(scheduleId: number, studentId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<AnswerSheetUploadResponseDTO>(
      "/teacher/answer-sheets/upload",
      formData,
      {
        params: { scheduleId, studentId },
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
  },

  // ── Image-based Answer Sheet APIs ─────────────────────────────────

  /** POST /teacher/answer-sheets/images/upload (multipart — multiple images) */
  uploadAnswerSheetImages(
    scheduleId: number,
    studentId: string,
    files: File[],
    pageNumbers?: number[]
  ) {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    const params: Record<string, unknown> = { scheduleId, studentId };
    if (pageNumbers?.length) params.pageNumbers = pageNumbers.join(",");
    return api.post<AnswerSheetImageGroupResponseDTO>(
      "/teacher/answer-sheets/images/upload",
      formData,
      {
        params,
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
  },

  /** POST /teacher/answer-sheets/images/complete */
  completeImageUpload(scheduleId: number, studentId: string) {
    return api.post<AnswerSheetImageGroupResponseDTO>(
      "/teacher/answer-sheets/images/complete",
      null,
      { params: { scheduleId, studentId } }
    );
  },

  /** GET /teacher/answer-sheets/{studentId}/{scheduleId} */
  getAnswerSheetImages(studentId: string, scheduleId: number) {
    return api.get<AnswerSheetImageGroupResponseDTO>(
      `/teacher/answer-sheets/${studentId}/${scheduleId}`
    );
  },

  /** GET /teacher/evaluation/{answerSheetId}/structure */
  getEvaluationStructure(answerSheetId: number) {
    return api.get<AnswerEvaluationStructureResponseDTO>(
      `/teacher/evaluation/${answerSheetId}/structure`
    );
  },

  /** POST /teacher/evaluation/{answerSheetId}/marks */
  saveDraftMarks(answerSheetId: number, data: SaveEvaluationMarksRequestDTO) {
    return api.post<EvaluationResultResponseDTO>(
      `/teacher/evaluation/${answerSheetId}/marks`,
      data
    );
  },

  /** POST /teacher/evaluation/{answerSheetId}/submit — submits for admin review */
  submitMarks(answerSheetId: number) {
    return api.post<EvaluationResultResponseDTO>(
      `/teacher/evaluation/${answerSheetId}/submit`
    );
  },

  /** GET /teacher/answer-sheets/{id}/annotations */
  getAnnotations(answerSheetId: number) {
    return api.get<AnnotationResponseDTO[]>(
      `/teacher/answer-sheets/${answerSheetId}/annotations`
    );
  },

  /** POST /teacher/answer-sheets/{id}/annotations */
  createAnnotation(answerSheetId: number, data: AnnotationRequestDTO) {
    return api.post<AnnotationResponseDTO>(
      `/teacher/answer-sheets/${answerSheetId}/annotations`,
      data
    );
  },

  /** GET /teacher/answer-sheets/{id}/signed-url */
  getSignedUrl(answerSheetId: number) {
    return api.get<string>(
      `/teacher/answer-sheets/${answerSheetId}/signed-url`
    );
  },

  /** GET /teacher/evaluation/{scheduleId}/answer-sheets */
  getAnswerSheets(scheduleId: number, page = 0, size = 25) {
    return api.get<PageResponse<AnswerSheetUploadResponseDTO>>(
      `/teacher/evaluation/${scheduleId}/answer-sheets`,
      { params: { page, size } }
    );
  },

  /** POST /teacher/evaluation/{scheduleId}/upload-complete */
  markScheduleUploadComplete(scheduleId: number) {
    return api.post<EvaluationAssignmentResponseDTO>(
      `/teacher/evaluation/${scheduleId}/upload-complete`
    );
  },

  /** DELETE /auth/examination/evaluation/assignments/{assignmentId} */
  deleteAssignment(assignmentId: number) {
    return api.delete(`/auth/examination/evaluation/assignments/${assignmentId}`);
  },

  // ── Admin Result Review APIs ──────────────────────────────────────

  /** GET /admin/results?status= */
  getResultsForAdmin(status?: EvaluationResultStatus) {
    return api.get<AdminResultReviewResponseDTO[]>(
      "/admin/results",
      { params: status ? { status } : undefined }
    );
  },

  /** POST /admin/results/{id}/approve */
  approveResult(resultId: number) {
    return api.post<EvaluationResultResponseDTO>(
      `/admin/results/${resultId}/approve`
    );
  },

  /** POST /admin/results/{id}/reject */
  rejectResult(resultId: number) {
    return api.post<EvaluationResultResponseDTO>(
      `/admin/results/${resultId}/reject`
    );
  },

  /** POST /admin/results/{id}/publish */
  publishResult(resultId: number) {
    return api.post<EvaluationResultResponseDTO>(
      `/admin/results/${resultId}/publish`
    );
  },

  /** POST /admin/results/publish-bulk */
  publishResultsBulk(resultIds: number[]) {
    return api.post<{ publishedCount: number }>(
      `/admin/results/publish-bulk`,
      resultIds
    );
  },

  /** GET /admin/results/summary */
  getClassResultSummary(classId: string, examId: string) {
    return api.get<ClassResultSummaryResponseDTO>(
      `/admin/results/summary`,
      { params: { classId, examId } }
    );
  },

  /** POST /admin/results/approve-class */
  approveClass(classId: string, examId: string) {
    return api.post<{ approvedCount: number }>(
      `/admin/results/approve-class`,
      null,
      { params: { classId, examId } }
    );
  },

  /** POST /admin/results/publish-class */
  publishClass(classId: string, examId: string) {
    return api.post<{ publishedCount: number }>(
      `/admin/results/publish-class`,
      null,
      { params: { classId, examId } }
    );
  },

  // ── Student Result APIs ───────────────────────────────────────────

  /** GET /student/results */
  getStudentResults() {
    return api.get<StudentResultResponseDTO[]>("/student/results");
  },

  /** GET /student/results/{id} */
  getStudentResultDetail(resultId: number) {
    return api.get<StudentResultDetailResponseDTO>(
      `/student/results/${resultId}`
    );
  },

  /** GET /student/results/{id}/pdf — returns PDF blob */
  downloadStudentResultPdf(resultId: number) {
    return api.get<Blob>(`/student/results/${resultId}/pdf`, {
      responseType: "blob",
    });
  },
};
