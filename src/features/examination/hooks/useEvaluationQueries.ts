import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { evaluationService } from "@/services/evaluationService";
import type {
  EvaluationAssignmentCreateRequestDTO,
  SaveEvaluationMarksRequestDTO,
  AnnotationRequestDTO,
} from "@/services/types/evaluation";

// ── Query Keys ──────────────────────────────────────────────────────

export const evaluationKeys = {
  all: ["evaluation"] as const,
  adminAssignments: (teacherId?: string) =>
    [...evaluationKeys.all, "admin-assignments", teacherId ?? "all"] as const,
  myAssignments: () =>
    [...evaluationKeys.all, "my-assignments"] as const,
  students: (scheduleId: number) =>
    [...evaluationKeys.all, "students", scheduleId] as const,
  structure: (answerSheetId: number) =>
    [...evaluationKeys.all, "structure", answerSheetId] as const,
  annotations: (answerSheetId: number) =>
    [...evaluationKeys.all, "annotations", answerSheetId] as const,
  answerSheets: (scheduleId: number, page: number) =>
    [...evaluationKeys.all, "answer-sheets", scheduleId, page] as const,
  signedUrl: (answerSheetId: number) =>
    [...evaluationKeys.all, "signed-url", answerSheetId] as const,
  answerSheetImages: (studentId: string, scheduleId: number) =>
    [...evaluationKeys.all, "images", studentId, scheduleId] as const,
};

// ── Admin Queries ───────────────────────────────────────────────────

export const useAdminEvaluationAssignments = (teacherId?: string) =>
  useQuery({
    queryKey: evaluationKeys.adminAssignments(teacherId),
    queryFn: async () =>
      (await evaluationService.getAssignments(teacherId)).data,
  });

export const useAssignTeacher = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EvaluationAssignmentCreateRequestDTO) =>
      evaluationService.assignTeacher(data).then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: evaluationKeys.adminAssignments() }),
  });
};

// ── Teacher Queries ─────────────────────────────────────────────────

export const useMyEvaluationAssignments = () =>
  useQuery({
    queryKey: evaluationKeys.myAssignments(),
    queryFn: async () => (await evaluationService.getMyAssignments()).data,
    staleTime: 60_000,
  });

export const useEvaluationStudents = (scheduleId: number, enabled = true) =>
  useQuery({
    queryKey: evaluationKeys.students(scheduleId),
    queryFn: async () =>
      (await evaluationService.getStudentsForSchedule(scheduleId)).data,
    enabled: enabled && !!scheduleId,
    staleTime: 30_000,
  });

export const useEvaluationStructure = (
  answerSheetId: number,
  enabled = true
) =>
  useQuery({
    queryKey: evaluationKeys.structure(answerSheetId),
    queryFn: async () =>
      (await evaluationService.getEvaluationStructure(answerSheetId)).data,
    enabled: enabled && !!answerSheetId,
    staleTime: 5 * 60_000, // template structure rarely changes
    refetchOnWindowFocus: false,
  });

export const useAnswerSheetSignedUrl = (
  answerSheetId: number,
  enabled = true
) =>
  useQuery({
    queryKey: evaluationKeys.signedUrl(answerSheetId),
    queryFn: async () =>
      (await evaluationService.getSignedUrl(answerSheetId)).data,
    enabled: enabled && !!answerSheetId,
    staleTime: 8 * 60_000, // URLs expire in 10 min; refetch after 8
    refetchOnWindowFocus: false,
  });

export const useAnswerSheetAnnotations = (
  answerSheetId: number,
  enabled = true
) =>
  useQuery({
    queryKey: evaluationKeys.annotations(answerSheetId),
    queryFn: async () =>
      (await evaluationService.getAnnotations(answerSheetId)).data,
    enabled: enabled && !!answerSheetId,
    refetchOnWindowFocus: false,
  });

// ── Image Upload Queries ────────────────────────────────────────────

export const useAnswerSheetImages = (
  studentId: string,
  scheduleId: number,
  enabled = true
) =>
  useQuery({
    queryKey: evaluationKeys.answerSheetImages(studentId, scheduleId),
    queryFn: async () =>
      (await evaluationService.getAnswerSheetImages(studentId, scheduleId)).data,
    enabled: enabled && !!studentId && !!scheduleId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

// ── Teacher Mutations ───────────────────────────────────────────────

export const useUploadAnswerSheet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      scheduleId,
      studentId,
      file,
    }: {
      scheduleId: number;
      studentId: string;
      file: File;
    }) => evaluationService.uploadAnswerSheet(scheduleId, studentId, file).then((r) => r.data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: evaluationKeys.students(vars.scheduleId),
      });
    },
  });
};

export const useUploadAnswerSheetImages = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      scheduleId,
      studentId,
      files,
      pageNumbers,
    }: {
      scheduleId: number;
      studentId: string;
      files: File[];
      pageNumbers?: number[];
    }) =>
      evaluationService
        .uploadAnswerSheetImages(scheduleId, studentId, files, pageNumbers)
        .then((r) => r.data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: evaluationKeys.students(vars.scheduleId),
      });
      qc.invalidateQueries({
        queryKey: evaluationKeys.answerSheetImages(vars.studentId, vars.scheduleId),
      });
    },
  });
};

export const useCompleteImageUpload = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      scheduleId,
      studentId,
    }: {
      scheduleId: number;
      studentId: string;
    }) =>
      evaluationService
        .completeImageUpload(scheduleId, studentId)
        .then((r) => r.data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: evaluationKeys.students(vars.scheduleId),
      });
      qc.invalidateQueries({
        queryKey: evaluationKeys.answerSheetImages(vars.studentId, vars.scheduleId),
      });
    },
  });
};

export const useSaveDraftMarks = () => {
  return useMutation({
    mutationFn: ({
      answerSheetId,
      data,
    }: {
      answerSheetId: number;
      data: SaveEvaluationMarksRequestDTO;
    }) => evaluationService.saveDraftMarks(answerSheetId, data).then((r) => r.data),
    // No onSuccess invalidation — marks are managed locally in state.
    // Structure query is only invalidated on publish.
  });
};

export const usePublishMarks = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (answerSheetId: number) =>
      evaluationService.publishMarks(answerSheetId).then((r) => r.data),
    onSuccess: (_d, answerSheetId) => {
      qc.invalidateQueries({
        queryKey: evaluationKeys.structure(answerSheetId),
      });
      qc.invalidateQueries({
        queryKey: evaluationKeys.myAssignments(),
      });
    },
  });
};

export const useCreateAnnotation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      answerSheetId,
      data,
    }: {
      answerSheetId: number;
      data: AnnotationRequestDTO;
    }) =>
      evaluationService
        .createAnnotation(answerSheetId, data)
        .then((r) => r.data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({
        queryKey: evaluationKeys.annotations(vars.answerSheetId),
      });
    },
  });
};

