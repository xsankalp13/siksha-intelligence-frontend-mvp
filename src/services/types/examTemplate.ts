// ── Exam Template DTOs ──────────────────────────────────────────────
// Aligned with backend: ExamTemplateRequestDTO, ExamTemplateResponseDTO,
// TemplateSectionRequestDTO, TemplateSectionResponseDTO

// TemplateSection — nested within template requests/responses
export interface TemplateSectionDTO {
  id?: string;                  // UUID from backend (response only)
  sectionName: string;
  sectionOrder: number;
  questionCount: number;        // ≥ 1
  marksPerQuestion: number;     // ≥ 1
  // Future flags (matches backend entity columns)
  isObjective?: boolean;
  isSubjective?: boolean;
}

// ExamTemplate — request payload for create/update
export interface ExamTemplateRequestDTO {
  name: string;
  sections: TemplateSectionDTO[];
}

// ExamTemplate — response from backend
export interface ExamTemplateResponseDTO {
  id: string;                   // UUID
  name: string;
  totalMarks: number;           // server-computed: Σ(questionCount × marksPerQuestion)
  totalQuestions: number;        // server-computed: Σ(questionCount)
  inUse: boolean;               // true → template is immutable (used in an exam)
  createdAt: string;
  sections: TemplateSectionDTO[];
}

// ── Template Snapshot DTOs (Stored in ExamSchedule as JSON) ─────────
// Matches backend: TemplateSnapshot.java / TemplateSnapshotSection.java

export interface TemplateSnapshotSection {
  name: string;
  sectionOrder: number;
  questionCount: number;
  marksPerQuestion: number;
}

export interface TemplateSnapshotDTO {
  templateName: string;
  totalMarks: number;
  totalQuestions: number;
  sections: TemplateSnapshotSection[];
}

// ── Evaluation Structure DTOs ───────────────────────────────────────
// Returned by GET /auth/examination/schedules/{id}/evaluation-structure
// Matches backend: EvaluationStructureResponseDTO.java

export interface EvaluationQuestion {
  qNo: number;
  maxMarks: number;
}

export interface EvaluationSection {
  name: string;
  questions: EvaluationQuestion[];
}

export interface EvaluationStructureDTO {
  sections: EvaluationSection[];
}
