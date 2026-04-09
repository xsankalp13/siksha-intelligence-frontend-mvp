// ── Examination DTOs ─────────────────────────────────────────────────
import type { TemplateSnapshotDTO } from "./examTemplate";

// Exams
export type ExamType = "MIDTERM" | "FINAL" | "UNIT_TEST" | "FORMATIVE" | "SUMMATIVE";

export interface ExamRequestDTO {
  name: string;
  academicYear: string;
  examType: ExamType;
  startDate: string;
  endDate: string;
}

export interface ExamResponseDTO {
  uuid: string;
  name: string;
  academicYear: string;
  examType: ExamType;
  startDate: string;
  endDate: string;
  templateId?: string;          // Optional — UUID of the linked ExamTemplate
  templateName?: string;        // Optional — Name of the linked ExamTemplate
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  published: boolean;
}

// Exam Schedules
export interface ExamScheduleRequestDTO {
  templateId: string;
  classId: string;
  sectionId?: string;
  subjectId: string;
  examDate: string;          // "YYYY-MM-DD"
  startTime: string;         // "HH:mm"
  endTime: string;           // "HH:mm"
  duration: number;           // positive integer (minutes)
  maxMarks: number;           // positive integer
  passingMarks: number;       // positive integer, ≤ maxMarks
  maxStudentsPerSeat?: number; // 1=single (default), 2=double/bench sharing
  seatSide?: "LEFT" | "RIGHT"; // Side for double seating
  roomNumber?: string;
}

export interface ExamScheduleResponseDTO {
  scheduleId: number;
  examUuid: string;
  templateId?: string;
  templateSnapshot?: TemplateSnapshotDTO;
  classId: string;
  className: string;
  sectionId?: string;
  sectionName?: string;
  subjectId: string;
  subjectName: string;
  examDate: string;
  startTime?: string;
  endTime?: string;
  maxMarks: number;
  passingMarks?: number;
  totalStudents?: number;
  maxStudentsPerSeat?: number; // 1=single, 2=double/bench sharing
  seatSide?: "LEFT" | "RIGHT";
  roomNumber?: string;
}

// Question Bank
export type QuestionType = "MCQ" | "SHORT_ANSWER" | "LONG_ANSWER" | "TRUE_FALSE";
export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";

export interface QuestionBankRequestDTO {
  subjectId: string;
  classId: string;
  topic?: string;
  questionType: QuestionType;
  difficultyLevel: DifficultyLevel;
  questionText: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: string;
  marks: number;
}

export interface QuestionBankResponseDTO {
  uuid: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  topic?: string;
  questionType: QuestionType;
  difficultyLevel: DifficultyLevel;
  questionText: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: string;
  marks: number;
  createdAt: string;
  createdBy: string;
}

export interface QuestionBankQueryParams {
  subjectId?: string;
  classId?: string;
  topic?: string;
  type?: QuestionType;
  difficulty?: DifficultyLevel;
}

// Paper-Question Mappings
export interface PaperQuestionMapRequestDTO {
  questionUuid: string;
  questionNumber: string;
  marksForQuestion: number;
}

export interface PaperQuestionMapResponseDTO {
  paperQuestionId: number;
  questionNumber: string;
  marksForQuestion: number;
  questionUuid: string;
  questionText: string;
}

// Question Papers
export interface QuestionPaperRequestDTO {
  scheduleId: number;
  paperName: string;
  totalMarks: number;
  durationMinutes: number;
  instructions?: string;
  questionMappings: PaperQuestionMapRequestDTO[];
}

export interface QuestionPaperResponseDTO {
  uuid: string;
  scheduleId: number;
  paperName: string;
  totalMarks: number;
  durationMinutes: number;
  instructions?: string;
  generatedAt: string;
  generatedBy: string;
  updatedAt: string;
  updatedBy: string;
  questionMappings: PaperQuestionMapResponseDTO[];
}

// Student Marks
export type AttendanceStatus = "PRESENT" | "ABSENT" | "MEDICAL";

export interface StudentMarkRequestDTO {
  studentId: number;
  marksObtained?: number;
  attendanceStatus: AttendanceStatus;
  remarks?: string;
}

export interface StudentMarkResponseDTO {
  markUuid: string;
  scheduleId: number;
  studentId: number;
  studentName: string;
  enrollmentNumber?: string;
  marksObtained?: number;
  attendanceStatus: AttendanceStatus;
  grade?: string;
  remarks?: string;
}

export interface BulkMarkRequestDTO {
  marks: StudentMarkRequestDTO[];
}

// Grade Systems
export interface GradeScaleRequestDTO {
  gradeName: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoints?: number;
}

export interface GradeScaleResponseDTO {
  gradeScaleId: number;
  systemName: string;
  gradeName: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoints?: number;
}

export interface GradeSystemRequestDTO {
  systemName: string;
  description?: string;
  isActive?: boolean;
  gradeScales: GradeScaleRequestDTO[];
}

export interface GradeSystemResponseDTO {
  uuid: string;
  systemName: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  gradeScales: GradeScaleResponseDTO[];
  active: boolean;
}

// Past Papers
export type PastPaperExamType = "MIDTERM" | "FINAL" | "UNIT_TEST" | "OTHER";

export interface PastPaperRequestDTO {
  title: string;
  classId: string;
  subjectId: string;
  examYear: number;
  examType: PastPaperExamType;
}

export interface PastPaperResponseDTO {
  uuid: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  title: string;
  examYear: number;
  examType: PastPaperExamType;
  fileUrl?: string;
  fileMimeType?: string;
  fileSizeKb?: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface PastPaperQueryParams {
  classId?: string;
  subjectId?: string;
  year?: number;
}

// Admit Cards
export interface AdmitCardEntryResponseDTO {
  examScheduleId: number;
  subjectId: number;
  subjectName: string;
  examDate: string;
  startTime: string;
  endTime: string;
  roomId: number;
  roomName?: string;
  seatId: number;
  seatLabel?: string;
}

export interface AdmitCardResponseDTO {
  admitCardId: number;
  examId: number;
  examName: string;
  studentId: string;
  studentName: string;
  enrollmentNumber?: string;
  generatedAt: string;
  status: "DRAFT" | "PUBLISHED";
  pdfUrl?: string;
  publishedBy?: string;
  publishedAt?: string;
  entries: AdmitCardEntryResponseDTO[];
}

export interface AdmitCardGenerationResponseDTO {
  examId: number;
  examName: string;
  generatedCount: number;
  generatedAt: string;
  message: string;
}

export interface ScheduleAdmitCardStatusDTO {
  scheduleId: number;
  className: string;
  sectionName?: string;
  subjectName: string;
  examDate: string;
  totalStudents: number;
  generatedCount: number;
  allGenerated: boolean;
  publishedCount: number;
  allPublished: boolean;
  lastGeneratedAt?: string;
}

