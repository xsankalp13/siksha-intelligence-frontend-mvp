import { api } from "@/lib/axios";
import type {
  ExamRequestDTO,
  ExamResponseDTO,
  ExamScheduleRequestDTO,
  ExamScheduleResponseDTO,
  QuestionBankRequestDTO,
  QuestionBankResponseDTO,
  QuestionBankQueryParams,
  QuestionPaperRequestDTO,
  QuestionPaperResponseDTO,
  PaperQuestionMapRequestDTO,
  PaperQuestionMapResponseDTO,
  StudentMarkRequestDTO,
  StudentMarkResponseDTO,
  BulkMarkRequestDTO,
  GradeSystemRequestDTO,
  GradeSystemResponseDTO,
  GradeScaleRequestDTO,
  GradeScaleResponseDTO,
  PastPaperRequestDTO,
  PastPaperResponseDTO,
  PastPaperQueryParams,
  AdmitCardResponseDTO,
  AdmitCardGenerationResponseDTO,
  ScheduleAdmitCardStatusDTO,
} from "./types/examination";
import type {
  ExamTemplateRequestDTO,
  ExamTemplateResponseDTO,
  EvaluationStructureDTO,
} from "./types/examTemplate";

// ── Examination Service ──────────────────────────────────────────────

export const examinationService = {
  // ── Exams ────────────────────────────────────────────────────────
  /** GET /auth/examination/exams */
  getAllExams() {
    return api.get<ExamResponseDTO[]>("/auth/examination/exams");
  },

  /** POST /auth/examination/exams */
  createExam(data: ExamRequestDTO) {
    return api.post<ExamResponseDTO>("/auth/examination/exams", data);
  },

  /** GET /auth/examination/exams/:uuid */
  getExamByUuid(uuid: string) {
    return api.get<ExamResponseDTO>(`/auth/examination/exams/${uuid}`);
  },

  /** PUT /auth/examination/exams/:uuid */
  updateExam(uuid: string, data: ExamRequestDTO) {
    return api.put<ExamResponseDTO>(`/auth/examination/exams/${uuid}`, data);
  },

  /** DELETE /auth/examination/exams/:uuid */
  deleteExam(uuid: string) {
    return api.delete(`/auth/examination/exams/${uuid}`);
  },

  /** PATCH /auth/examination/exams/:uuid/publish */
  publishExam(uuid: string) {
    return api.patch<ExamResponseDTO>(`/auth/examination/exams/${uuid}/publish`, {
      published: true,
      isPublished: true,
      publish: true,
      status: true
    });
  },

  // ── Exam Schedules ───────────────────────────────────────────────
  /** GET /auth/examination/exams/:examUuid/schedules */
  getSchedulesByExam(examUuid: string) {
    return api.get<ExamScheduleResponseDTO[]>(
      `/auth/examination/exams/${examUuid}/schedules`
    );
  },

  /** POST /auth/examination/exams/:examUuid/schedules */
  createSchedule(examUuid: string, data: ExamScheduleRequestDTO) {
    return api.post<ExamScheduleResponseDTO>(
      `/auth/examination/exams/${examUuid}/schedules`,
      data
    );
  },

  /** GET /auth/examination/schedules/:scheduleId */
  getScheduleById(scheduleId: number) {
    return api.get<ExamScheduleResponseDTO>(
      `/auth/examination/schedules/${scheduleId}`
    );
  },

  /** PUT /auth/examination/schedules/:scheduleId */
  updateSchedule(scheduleId: number, data: ExamScheduleRequestDTO) {
    return api.put<ExamScheduleResponseDTO>(
      `/auth/examination/schedules/${scheduleId}`,
      data
    );
  },

  /** DELETE /auth/examination/schedules/:scheduleId */
  deleteSchedule(scheduleId: number) {
    return api.delete(`/auth/examination/schedules/${scheduleId}`);
  },

  // ── Question Bank ────────────────────────────────────────────────
  /** GET /auth/examination/questions */
  getAllQuestions(params?: QuestionBankQueryParams) {
    return api.get<QuestionBankResponseDTO[]>("/auth/examination/questions", {
      params,
    });
  },

  /** POST /auth/examination/questions */
  createQuestion(data: QuestionBankRequestDTO) {
    return api.post<QuestionBankResponseDTO>("/auth/examination/questions", data);
  },

  /** GET /auth/examination/questions/:uuid */
  getQuestionByUuid(uuid: string) {
    return api.get<QuestionBankResponseDTO>(`/auth/examination/questions/${uuid}`);
  },

  /** PUT /auth/examination/questions/:uuid */
  updateQuestion(uuid: string, data: QuestionBankRequestDTO) {
    return api.put<QuestionBankResponseDTO>(
      `/auth/examination/questions/${uuid}`,
      data
    );
  },

  /** DELETE /auth/examination/questions/:uuid */
  deleteQuestion(uuid: string) {
    return api.delete(`/auth/examination/questions/${uuid}`);
  },

  // ── Question Papers ──────────────────────────────────────────────
  /** POST /auth/examination/papers/generate */
  generateQuestionPaper(data: QuestionPaperRequestDTO) {
    return api.post<QuestionPaperResponseDTO>(
      "/auth/examination/papers/generate",
      data
    );
  },

  /** GET /auth/examination/papers/:uuid */
  getQuestionPaperByUuid(uuid: string) {
    return api.get<QuestionPaperResponseDTO>(`/auth/examination/papers/${uuid}`);
  },

  /** GET /auth/examination/papers/by-schedule/:scheduleId */
  getQuestionPaperBySchedule(scheduleId: number) {
    return api.get<QuestionPaperResponseDTO>(
      `/auth/examination/papers/by-schedule/${scheduleId}`
    );
  },

  /** DELETE /auth/examination/papers/:uuid */
  deleteQuestionPaper(uuid: string) {
    return api.delete(`/auth/examination/papers/${uuid}`);
  },

  // ── Paper-Question Mappings ──────────────────────────────────────
  /** POST /auth/examination/papers/:paperId/questions */
  addQuestionToPaper(paperId: number, data: PaperQuestionMapRequestDTO) {
    return api.post<PaperQuestionMapResponseDTO>(
      `/auth/examination/papers/${paperId}/questions`,
      data
    );
  },

  /** PUT /auth/examination/paper-mappings/:mappingId */
  updateMapping(mappingId: number, data: PaperQuestionMapRequestDTO) {
    return api.put<PaperQuestionMapResponseDTO>(
      `/auth/examination/paper-mappings/${mappingId}`,
      data
    );
  },

  /** DELETE /auth/examination/paper-mappings/:mappingId */
  deleteMapping(mappingId: number) {
    return api.delete(`/auth/examination/paper-mappings/${mappingId}`);
  },

  // ── Student Marks ────────────────────────────────────────────────
  /** GET /auth/examination/schedules/:scheduleId/marks */
  getMarksBySchedule(scheduleId: number) {
    return api.get<StudentMarkResponseDTO[]>(
      `/auth/examination/schedules/${scheduleId}/marks`
    );
  },

  /** POST /auth/examination/schedules/:scheduleId/marks (bulk upsert) */
  recordBulkMarks(scheduleId: number, data: BulkMarkRequestDTO) {
    return api.post<StudentMarkResponseDTO[]>(
      `/auth/examination/schedules/${scheduleId}/marks`,
      data
    );
  },

  /** PUT /auth/examination/marks/:markUuid */
  updateMark(markUuid: string, data: StudentMarkRequestDTO) {
    return api.put<StudentMarkResponseDTO>(
      `/auth/examination/marks/${markUuid}`,
      data
    );
  },

  // ── Grade Systems ────────────────────────────────────────────────
  /** GET /auth/examination/grade-systems */
  getAllGradeSystems() {
    return api.get<GradeSystemResponseDTO[]>("/auth/examination/grade-systems");
  },

  /** POST /auth/examination/grade-systems */
  createGradeSystem(data: GradeSystemRequestDTO) {
    return api.post<GradeSystemResponseDTO>(
      "/auth/examination/grade-systems",
      data
    );
  },

  /** GET /auth/examination/grade-systems/:uuid */
  getGradeSystemByUuid(uuid: string) {
    return api.get<GradeSystemResponseDTO>(
      `/auth/examination/grade-systems/${uuid}`
    );
  },

  /** PUT /auth/examination/grade-systems/:uuid */
  updateGradeSystem(uuid: string, data: GradeSystemRequestDTO) {
    return api.put<GradeSystemResponseDTO>(
      `/auth/examination/grade-systems/${uuid}`,
      data
    );
  },

  /** DELETE /auth/examination/grade-systems/:uuid */
  deleteGradeSystem(uuid: string) {
    return api.delete(`/auth/examination/grade-systems/${uuid}`);
  },

  // ── Grade Scales ─────────────────────────────────────────────────
  /** GET /auth/examination/grade-systems/:systemUuid/scales */
  getScalesBySystem(systemUuid: string) {
    return api.get<GradeScaleResponseDTO[]>(
      `/auth/examination/grade-systems/${systemUuid}/scales`
    );
  },

  /** POST /auth/examination/grade-systems/:systemUuid/scales */
  addScaleToSystem(systemUuid: string, data: GradeScaleRequestDTO) {
    return api.post<GradeScaleResponseDTO>(
      `/auth/examination/grade-systems/${systemUuid}/scales`,
      data
    );
  },

  /** GET /auth/examination/grade-scales/:scaleId */
  getGradeScaleById(scaleId: number) {
    return api.get<GradeScaleResponseDTO>(
      `/auth/examination/grade-scales/${scaleId}`
    );
  },

  /** PUT /auth/examination/grade-scales/:scaleId */
  updateGradeScale(scaleId: number, data: GradeScaleRequestDTO) {
    return api.put<GradeScaleResponseDTO>(
      `/auth/examination/grade-scales/${scaleId}`,
      data
    );
  },

  /** DELETE /auth/examination/grade-scales/:scaleId */
  deleteGradeScale(scaleId: number) {
    return api.delete(`/auth/examination/grade-scales/${scaleId}`);
  },

  // ── Past Papers ──────────────────────────────────────────────────
  /** GET /auth/examination/past-papers */
  getAllPastPapers(params?: PastPaperQueryParams) {
    return api.get<PastPaperResponseDTO[]>("/auth/examination/past-papers", {
      params,
    });
  },

  /** POST /auth/examination/past-papers (multipart) */
  uploadPastPaper(metadata: PastPaperRequestDTO, file: File) {
    const formData = new FormData();
    formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    formData.append("file", file);
    return api.post<PastPaperResponseDTO>("/auth/examination/past-papers", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /** GET /auth/examination/past-papers/:uuid */
  getPastPaperByUuid(uuid: string) {
    return api.get<PastPaperResponseDTO>(`/auth/examination/past-papers/${uuid}`);
  },

  /** DELETE /auth/examination/past-papers/:uuid */
  deletePastPaper(uuid: string) {
    return api.delete(`/auth/examination/past-papers/${uuid}`);
  },

  // ── Exam Templates ────────────────────────────────────────────────
  /** GET /auth/examination/templates */
  getAllTemplates() {
    return api.get<ExamTemplateResponseDTO[]>("/auth/examination/templates");
  },

  /** GET /auth/examination/templates/:id */
  getTemplateById(id: string) {
    return api.get<ExamTemplateResponseDTO>(`/auth/examination/templates/${id}`);
  },

  /** POST /auth/examination/templates */
  createTemplate(data: ExamTemplateRequestDTO) {
    return api.post<ExamTemplateResponseDTO>("/auth/examination/templates", data);
  },

  /** PUT /auth/examination/templates/:id (only if unused) */
  updateTemplate(id: string, data: ExamTemplateRequestDTO) {
    return api.put<ExamTemplateResponseDTO>(`/auth/examination/templates/${id}`, data);
  },

  /** DELETE /auth/examination/templates/:id (only if unused) */
  deleteTemplate(id: string) {
    return api.delete(`/auth/examination/templates/${id}`);
  },

  /** GET /auth/examination/templates/:id/preview (optional) */
  getTemplatePreview(id: string) {
    return api.get(`/auth/examination/templates/${id}/preview`);
  },

  // ── Evaluation Structure ──────────────────────────────────────────
  /** GET /auth/examination/schedules/:scheduleId/evaluation-structure */
  getEvaluationStructure(scheduleId: number) {
    return api.get<EvaluationStructureDTO>(
      `/auth/examination/schedules/${scheduleId}/evaluation-structure`
    );
  },

  // ── Admit Cards ──────────────────────────────────────────────────
  /** POST /admin/admit-cards/generate (full exam) */
  generateAdmitCards(examUuid: string) {
    return api.post<AdmitCardGenerationResponseDTO>(
      `/admin/admit-cards/generate`,
      { examId: examUuid }
    );
  },

  /** POST /admin/admit-cards/generate (per-schedule) */
  generateAdmitCardsForSchedule(examUuid: string, scheduleId: number) {
    return api.post<AdmitCardGenerationResponseDTO>(
      `/admin/admit-cards/generate/schedule/${scheduleId}`,
      { examId: examUuid }
    );
  },

  /** GET /admin/admit-cards/status/:examUuid */
  getAdmitCardStatus(examUuid: string) {
    return api.get<ScheduleAdmitCardStatusDTO[]>(
      `/admin/admit-cards/status/${examUuid}`
    );
  },

  /** POST /admin/admit-cards/publish/:examUuid */
  publishAdmitCards(examUuid: string) {
    return api.post(`/admin/admit-cards/publish/${examUuid}`);
  },

  /** POST /admin/admit-cards/publish/:examUuid/schedules */
  publishAdmitCardsForSchedules(examUuid: string, scheduleIds: number[]) {
    return api.post(`/admin/admit-cards/publish/${examUuid}/schedules`, {
      scheduleIds,
    });
  },

  /** GET /admin/admit-cards/download/:examUuid */
  downloadAdminAdmitCardsZip(examUuid: string) {
    return api.get(`/admin/admit-cards/download/${examUuid}`, {
      responseType: "blob",
    });
  },

  /** GET /student/admit-card/:examUuid */
  getStudentAdmitCard(examUuid: string) {
    return api.get<AdmitCardResponseDTO>(`/student/admit-card/${examUuid}`);
  },

  /** GET /student/admit-card/:examId/pdf */
  downloadStudentAdmitCardPdf(examUuid: string) {
    return api.get(`/student/admit-card/${examUuid}/pdf`, {
      responseType: "blob",
    });
  },
};

