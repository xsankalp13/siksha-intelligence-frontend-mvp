import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { examinationService } from "@/services/examination";
import type {
  ExamRequestDTO,
  ExamScheduleRequestDTO,
  QuestionBankRequestDTO,
  QuestionBankQueryParams,
  QuestionPaperRequestDTO,
  PaperQuestionMapRequestDTO,
  BulkMarkRequestDTO,
  GradeSystemRequestDTO,
  GradeScaleRequestDTO,
  PastPaperRequestDTO,
  PastPaperQueryParams,
  StudentMarkRequestDTO,
} from "@/services/types/examination";

// ── Query Keys ──────────────────────────────────────────────────────
const keys = {
  exams: ["examination", "exams"] as const,
  exam: (uuid: string) => ["examination", "exams", uuid] as const,
  schedules: (examUuid: string) =>
    ["examination", "schedules", examUuid] as const,
  schedule: (id: number) => ["examination", "schedule", id] as const,
  questions: (params?: QuestionBankQueryParams) =>
    ["examination", "questions", params] as const,
  question: (uuid: string) => ["examination", "questions", uuid] as const,
  questionPaper: (uuid: string) =>
    ["examination", "papers", uuid] as const,
  questionPaperBySchedule: (scheduleId: number) =>
    ["examination", "papers", "schedule", scheduleId] as const,
  marks: (scheduleId: number) =>
    ["examination", "marks", scheduleId] as const,
  gradeSystems: ["examination", "grade-systems"] as const,
  gradeSystem: (uuid: string) =>
    ["examination", "grade-systems", uuid] as const,
  gradeScales: (systemUuid: string) =>
    ["examination", "grade-scales", systemUuid] as const,
  pastPapers: (params?: PastPaperQueryParams) =>
    ["examination", "past-papers", params] as const,
};

// ── Exams ────────────────────────────────────────────────────────────

export const useGetAllExams = () =>
  useQuery({
    queryKey: keys.exams,
    queryFn: async () => (await examinationService.getAllExams()).data,
  });

export const useGetExamByUuid = (uuid: string) =>
  useQuery({
    queryKey: keys.exam(uuid),
    queryFn: async () => (await examinationService.getExamByUuid(uuid)).data,
    enabled: !!uuid,
  });

export const useCreateExam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ExamRequestDTO) =>
      examinationService.createExam(data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.exams }),
  });
};

export const useUpdateExam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string; data: ExamRequestDTO }) =>
      examinationService.updateExam(uuid, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.exams }),
  });
};

export const useDeleteExam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) => examinationService.deleteExam(uuid),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.exams }),
  });
};

export const usePublishExam = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) =>
      examinationService.publishExam(uuid).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.exams }),
  });
};

// ── Exam Schedules ──────────────────────────────────────────────────

export const useGetSchedulesByExam = (examUuid: string) =>
  useQuery({
    queryKey: keys.schedules(examUuid),
    queryFn: async () =>
      (await examinationService.getSchedulesByExam(examUuid)).data,
    enabled: !!examUuid,
  });

export const useCreateSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      examUuid,
      data,
    }: {
      examUuid: string;
      data: ExamScheduleRequestDTO;
    }) => examinationService.createSchedule(examUuid, data).then((r) => r.data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: keys.schedules(v.examUuid) }),
  });
};

export const useUpdateSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      scheduleId,
      data,
    }: {
      scheduleId: number;
      examUuid: string;
      data: ExamScheduleRequestDTO;
    }) =>
      examinationService.updateSchedule(scheduleId, data).then((r) => r.data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: keys.schedules(v.examUuid) }),
  });
};

export const useDeleteSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId }: { scheduleId: number; examUuid: string }) =>
      examinationService.deleteSchedule(scheduleId),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: keys.schedules(v.examUuid) }),
  });
};

// ── Student Marks ───────────────────────────────────────────────────

export const useGetMarksBySchedule = (scheduleId: number) =>
  useQuery({
    queryKey: keys.marks(scheduleId),
    queryFn: async () =>
      (await examinationService.getMarksBySchedule(scheduleId)).data,
    enabled: !!scheduleId,
  });

export const useRecordBulkMarks = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      scheduleId,
      data,
    }: {
      scheduleId: number;
      data: BulkMarkRequestDTO;
    }) =>
      examinationService.recordBulkMarks(scheduleId, data).then((r) => r.data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: keys.marks(v.scheduleId) }),
  });
};

export const useUpdateMark = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      markUuid,
      data,
    }: {
      markUuid: string;
      data: StudentMarkRequestDTO;
      scheduleId: number;
    }) => examinationService.updateMark(markUuid, data).then((r) => r.data),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: keys.marks(v.scheduleId) }),
  });
};

// ── Grade Systems ───────────────────────────────────────────────────

export const useGetAllGradeSystems = () =>
  useQuery({
    queryKey: keys.gradeSystems,
    queryFn: async () =>
      (await examinationService.getAllGradeSystems()).data,
  });

export const useGetGradeSystemByUuid = (uuid: string) =>
  useQuery({
    queryKey: keys.gradeSystem(uuid),
    queryFn: async () =>
      (await examinationService.getGradeSystemByUuid(uuid)).data,
    enabled: !!uuid,
  });

export const useCreateGradeSystem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GradeSystemRequestDTO) =>
      examinationService.createGradeSystem(data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: keys.gradeSystems }),
  });
};

export const useUpdateGradeSystem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      uuid,
      data,
    }: {
      uuid: string;
      data: GradeSystemRequestDTO;
    }) =>
      examinationService.updateGradeSystem(uuid, data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: keys.gradeSystems }),
  });
};

export const useDeleteGradeSystem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) =>
      examinationService.deleteGradeSystem(uuid),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: keys.gradeSystems }),
  });
};

// ── Grade Scales ────────────────────────────────────────────────────

export const useGetScalesBySystem = (systemUuid: string) =>
  useQuery({
    queryKey: keys.gradeScales(systemUuid),
    queryFn: async () =>
      (await examinationService.getScalesBySystem(systemUuid)).data,
    enabled: !!systemUuid,
  });

export const useAddScaleToSystem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      systemUuid,
      data,
    }: {
      systemUuid: string;
      data: GradeScaleRequestDTO;
    }) =>
      examinationService.addScaleToSystem(systemUuid, data).then((r) => r.data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: keys.gradeScales(v.systemUuid) });
      qc.invalidateQueries({ queryKey: keys.gradeSystems });
    },
  });
};

export const useUpdateGradeScale = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      scaleId,
      data,
    }: {
      scaleId: number;
      data: GradeScaleRequestDTO;
      systemUuid: string;
    }) =>
      examinationService.updateGradeScale(scaleId, data).then((r) => r.data),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: keys.gradeScales(v.systemUuid) });
      qc.invalidateQueries({ queryKey: keys.gradeSystems });
    },
  });
};

export const useDeleteGradeScale = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scaleId }: { scaleId: number; systemUuid: string }) =>
      examinationService.deleteGradeScale(scaleId),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: keys.gradeScales(v.systemUuid) });
      qc.invalidateQueries({ queryKey: keys.gradeSystems });
    },
  });
};

// ── Question Bank ───────────────────────────────────────────────────

export const useGetAllQuestions = (params?: QuestionBankQueryParams) =>
  useQuery({
    queryKey: keys.questions(params),
    queryFn: async () =>
      (await examinationService.getAllQuestions(params)).data,
  });

export const useCreateQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: QuestionBankRequestDTO) =>
      examinationService.createQuestion(data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["examination", "questions"] }),
  });
};

export const useUpdateQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      uuid,
      data,
    }: {
      uuid: string;
      data: QuestionBankRequestDTO;
    }) =>
      examinationService.updateQuestion(uuid, data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["examination", "questions"] }),
  });
};

export const useDeleteQuestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) => examinationService.deleteQuestion(uuid),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["examination", "questions"] }),
  });
};

// ── Question Papers ─────────────────────────────────────────────────

export const useGenerateQuestionPaper = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: QuestionPaperRequestDTO) =>
      examinationService.generateQuestionPaper(data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["examination", "papers"] }),
  });
};

export const useGetQuestionPaperBySchedule = (scheduleId: number) =>
  useQuery({
    queryKey: keys.questionPaperBySchedule(scheduleId),
    queryFn: async () =>
      (await examinationService.getQuestionPaperBySchedule(scheduleId)).data,
    enabled: !!scheduleId,
  });

export const useDeleteQuestionPaper = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) =>
      examinationService.deleteQuestionPaper(uuid),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["examination", "papers"] }),
  });
};

export const useAddQuestionToPaper = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      paperId,
      data,
    }: {
      paperId: number;
      data: PaperQuestionMapRequestDTO;
    }) =>
      examinationService
        .addQuestionToPaper(paperId, data)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["examination", "papers"] }),
  });
};

export const useUpdateMapping = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      mappingId,
      data,
    }: {
      mappingId: number;
      data: PaperQuestionMapRequestDTO;
    }) =>
      examinationService.updateMapping(mappingId, data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["examination", "papers"] }),
  });
};

export const useDeleteMapping = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mappingId: number) =>
      examinationService.deleteMapping(mappingId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["examination", "papers"] }),
  });
};

// ── Past Papers ─────────────────────────────────────────────────────

export const useGetAllPastPapers = (params?: PastPaperQueryParams) =>
  useQuery({
    queryKey: keys.pastPapers(params),
    queryFn: async () =>
      (await examinationService.getAllPastPapers(params)).data,
  });

export const useUploadPastPaper = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      metadata,
      file,
    }: {
      metadata: PastPaperRequestDTO;
      file: File;
    }) =>
      examinationService.uploadPastPaper(metadata, file).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["examination", "past-papers"] }),
  });
};

export const useDeletePastPaper = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) =>
      examinationService.deletePastPaper(uuid),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["examination", "past-papers"] }),
  });
};
