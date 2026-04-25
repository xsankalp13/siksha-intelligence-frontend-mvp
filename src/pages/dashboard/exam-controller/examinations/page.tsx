/**
 * Exam Controller — Examinations Page
 * 
 * This reuses the exact same tabbed interface as the Admin Examinations page.
 * All the panel components (ExamListPanel, ExamSchedulePanel, InvigilationPanel, etc.)
 * use shared API hooks that now allow EXAM_CONTROLLER role access on the backend.
 * 
 * The controller gets full exam management: scheduling, invigilation, seating,
 * templates, grading, question bank, admit cards, evaluation, and results.
 */
export { default } from "@/pages/dashboard/admin/examinations/page";
