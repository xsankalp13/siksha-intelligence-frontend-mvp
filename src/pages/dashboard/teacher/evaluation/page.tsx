import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  FileCheck,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  Clock,
  Play,
  Search,
  Save,
  Lock,
  RotateCcw,
  XCircle,
  ImagePlus,
  Camera,
  Check,
  X,
  Eye,
  ChevronDown,
  ChevronUp,
  Upload as UploadIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  useMyEvaluationAssignments,
  useEvaluationStudents,
  useEvaluationStructure,
  useSaveDraftMarks,
  useSubmitMarks,
  useUploadAnswerSheetImages,
  useCompleteImageUpload,
  useAnswerSheetImages,
  useAnswerSheetAnnotations,
  useCreateAnnotation,
  useMarkScheduleUploadComplete,
} from "@/features/examination/hooks/useEvaluationQueries";
import type {
  EvaluationAssignmentResponseDTO,
  TeacherEvaluationStudentResponseDTO,
  EvaluationAssignmentStatus,
  EvaluationAssignmentRole,
  SaveQuestionMarkRequestDTO,
  AnnotationType,
  AnnotationResponseDTO,
  EvaluationResultResponseDTO,
} from "@/services/types/evaluation";

// ── Status Configs ──────────────────────────────────────────────────

const assignmentStatusConfig: Record<
  EvaluationAssignmentStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  ASSIGNED: { label: "Assigned", color: "bg-amber-500/10 text-amber-700 border-amber-200", icon: Clock },
  IN_PROGRESS: { label: "In Progress", color: "bg-blue-500/10 text-blue-700 border-blue-200", icon: Play },
  COMPLETED: { label: "Completed", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
};

const sheetStatusConfig: Record<string, { label: string; color: string }> = {
  UPLOADED: { label: "Uploaded", color: "bg-sky-500/10 text-sky-700 border-sky-200" },
  COMPLETE: { label: "Complete", color: "bg-teal-500/10 text-teal-700 border-teal-200" },
  CHECKING: { label: "Checking", color: "bg-indigo-500/10 text-indigo-700 border-indigo-200" },
  DRAFT: { label: "Draft", color: "bg-amber-500/10 text-amber-700 border-amber-200" },
  FINAL: { label: "Published", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
};

// ── Main Page ────────────────────────────────────────────────────────

export default function TeacherEvaluationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scheduleId = searchParams.get("scheduleId") ? Number(searchParams.get("scheduleId")) : null;
  const studentId = searchParams.get("studentId") || null;
  const answerSheetId = searchParams.get("answerSheetId") ? Number(searchParams.get("answerSheetId")) : null;
  const currentRole = (searchParams.get("role") || "EVALUATOR") as EvaluationAssignmentRole;

  // Step 1: assignments list | Step 2: student upload panel | Step 3: evaluation view
  const step = answerSheetId && studentId ? 3 : scheduleId ? 2 : 1;

  const goToAssignments = useCallback(() => setSearchParams({}), [setSearchParams]);
  const goToStudents = useCallback(
    (sid: number, role: EvaluationAssignmentRole) => setSearchParams({ scheduleId: String(sid), role }),
    [setSearchParams]
  );
  const goToEvaluate = useCallback(
    (sid: number, stId: string, asid: number) =>
      setSearchParams({ scheduleId: String(sid), studentId: stId, answerSheetId: String(asid), role: currentRole }),
    [setSearchParams, currentRole]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      {/* Page Header */}
      <div className="flex items-start gap-3">
        {step > 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0"
            onClick={() => (step === 3 && scheduleId ? goToStudents(scheduleId, currentRole) : goToAssignments())}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <FileCheck className="w-5 h-5 text-violet-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Answer Evaluation</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-11">
            {step === 1 && "Your assigned evaluation schedules"}
            {step === 2 && currentRole === "UPLOADER" && "Upload answer sheets for students"}
            {step === 2 && currentRole === "EVALUATOR" && "Select a student to evaluate"}
            {step === 3 && "Evaluate answer sheet"}
          </p>
        </div>
      </div>

      {/* Step Content */}
      {step === 1 && <AssignmentsList onSelect={goToStudents} />}
      {step === 2 && scheduleId && (
        <StudentsUploadPanel
          scheduleId={scheduleId}
          role={currentRole}
          onBack={goToAssignments}
          onEvaluate={(stId, asId) => goToEvaluate(scheduleId, stId, asId)}
        />
      )}
      {step === 3 && scheduleId && answerSheetId && studentId && (
        <EvaluationView
          scheduleId={scheduleId}
          answerSheetId={answerSheetId}
          studentId={studentId}
          onBack={() => goToStudents(scheduleId, currentRole)}
        />
      )}
    </div>
  );
}

// ── Step 1: Assignments List ────────────────────────────────────────

function AssignmentsList({ onSelect }: { onSelect: (scheduleId: number, role: EvaluationAssignmentRole) => void }) {
  const [search, setSearch] = useState("");
  const { data: assignments = [], isLoading, isError } = useMyEvaluationAssignments();

  const filtered = useMemo(() => {
    if (!search.trim()) return assignments;
    const q = search.toLowerCase();
    return assignments.filter(
      (a) =>
        a.examName.toLowerCase().includes(q) ||
        a.subjectName.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q)
    );
  }, [assignments, search]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[250px]">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[250px] gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="font-semibold">Failed to load assignments</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search exams, subjects, role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[200px] rounded-xl border-2 border-dashed border-border/50 gap-2 bg-card text-center">
          <FileCheck className="w-8 h-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No evaluation assignments found</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <AssignmentCard key={a.assignmentId} assignment={a} onClick={() => onSelect(a.examScheduleId, a.role)} />
          ))}
        </div>
      )}
    </div>
  );
}

function AssignmentCard({
  assignment: a,
  onClick,
}: {
  assignment: EvaluationAssignmentResponseDTO;
  onClick: () => void;
}) {
  const cfg = assignmentStatusConfig[a.status];
  const Icon = cfg.icon;
  const isUploader = a.role === "UPLOADER";

  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="text-left w-full rounded-xl border border-border/60 bg-card p-4 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground leading-tight">{a.examName}</h3>
          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
            isUploader
              ? "bg-sky-500/10 text-sky-700 border-sky-200"
              : "bg-violet-500/10 text-violet-700 border-violet-200"
          }`}>
            {isUploader ? <UploadIcon className="w-2.5 h-2.5" /> : <FileCheck className="w-2.5 h-2.5" />}
            {isUploader ? "Uploader" : "Evaluator"}
          </span>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.color}`}>
          <Icon className="w-3 h-3" /> {cfg.label}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-2">{a.subjectName}</p>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {new Date(a.examDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        {a.dueDate && (
          <span className="flex items-center gap-1">
            Due: {new Date(a.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
      <div className="mt-3 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        {isUploader ? "Upload Sheets →" : "View Students →"}
      </div>
    </motion.button>
  );
}

// ── Step 2: Students Upload Panel ───────────────────────────────────

function StudentsUploadPanel({
  scheduleId,
  role,
  onBack,
  onEvaluate,
}: {
  scheduleId: number;
  role: EvaluationAssignmentRole;
  onBack: () => void;
  onEvaluate: (studentId: string, answerSheetId: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: students = [], isLoading, isError, refetch } = useEvaluationStudents(scheduleId);
  const markUploadCompleteMutation = useMarkScheduleUploadComplete();

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.enrollmentNumber?.toLowerCase().includes(q)
    );
  }, [students, search]);

  const stats = useMemo(() => {
    const uploaded = students.filter((s) => s.answerSheetStatus === "UPLOADED").length;
    const complete = students.filter((s) => s.answerSheetStatus === "COMPLETE" ||
      s.answerSheetStatus === "DRAFT" || s.answerSheetStatus === "CHECKING").length;
    const published = students.filter((s) => s.answerSheetStatus === "FINAL").length;
    const pending = students.length - uploaded - complete - published;
    return { uploaded, complete, published, pending };
  }, [students]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[250px]">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[250px] gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="font-semibold">Failed to load students</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RotateCcw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Uploader role info banner */}
      {role === "UPLOADER" && (
        <div className="flex items-center justify-between gap-2 text-xs font-medium bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 rounded-lg px-3 py-2 border border-sky-200 dark:border-sky-500/20">
          <div className="flex items-center gap-2">
            <UploadIcon className="w-4 h-4 shrink-0" />
            <span>You are assigned as <strong>Uploader</strong> — upload and manage answer sheets. Evaluation is handled by the evaluator.</span>
          </div>
          <Button
            size="sm"
            className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 shrink-0"
            disabled={markUploadCompleteMutation.isPending}
            onClick={async () => {
              try {
                await markUploadCompleteMutation.mutateAsync(scheduleId);
                toast.success("Uploads marked as complete — evaluator is now unblocked");
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Failed";
                toast.error(msg);
              }
            }}
          >
            {markUploadCompleteMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            Complete All Uploads
          </Button>
        </div>
      )}

      {/* Stats ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {role === "UPLOADER" ? [
          { label: "Pending Upload", value: stats.pending, color: "text-muted-foreground" },
          { label: "Uploaded", value: stats.uploaded, color: "text-sky-600" },
          { label: "Complete", value: stats.complete, color: "text-teal-600" },
          { label: "Published", value: stats.published, color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/50 bg-card p-3 text-center">
            <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        )) : [
          { label: "Pending Evaluation", value: stats.complete, color: "text-amber-600" },
          { label: "Checked", value: students.filter((s) => s.answerSheetStatus === "CHECKING" || s.answerSheetStatus === "DRAFT").length, color: "text-blue-600" },
          { label: "Published", value: stats.published, color: "text-emerald-600" },
          { label: "Awaiting Uploads", value: stats.pending + stats.uploaded, color: "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border/50 bg-card p-3 text-center">
            <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Student Cards */}
      <div className="space-y-2">
        {filtered.map((student) => (
          <StudentUploadCard
            key={student.studentId}
            student={student}
            scheduleId={scheduleId}
            role={role}
            isExpanded={expandedId === student.studentId}
            onToggle={() => setExpandedId(expandedId === student.studentId ? null : student.studentId)}
            onEvaluate={onEvaluate}
            onRefresh={refetch}
          />
        ))}
      </div>
    </div>
  );
}

// ── Student Upload Card ─────────────────────────────────────────────

function StudentUploadCard({
  student,
  scheduleId,
  role,
  isExpanded,
  onToggle,
  onEvaluate,
  onRefresh,
}: {
  student: TeacherEvaluationStudentResponseDTO;
  scheduleId: number;
  role: EvaluationAssignmentRole;
  isExpanded: boolean;
  onToggle: () => void;
  onEvaluate: (studentId: string, answerSheetId: number) => void;
  onRefresh: () => void;
}) {
  const status = student.answerSheetStatus;
  const cfg = status ? sheetStatusConfig[status] : null;
  const isUploader = role === "UPLOADER";
  const canEvaluate = !isUploader && status && status !== "UPLOADED"; // COMPLETE, DRAFT, CHECKING, FINAL
  const isFinal = status === "FINAL";

  const uploadMutation = useUploadAnswerSheetImages();
  const completeMutation = useCompleteImageUpload();
  const { data: imageGroup, refetch: refetchImages } = useAnswerSheetImages(
    student.studentId,
    scheduleId,
    isExpanded && !!student.answerSheetId
  );

  const [localPreviews, setLocalPreviews] = useState<
    { file: File; preview: string }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      localPreviews.forEach((p) => URL.revokeObjectURL(p.preview));
    };
  }, [localPreviews]);

  const handleFilesSelected = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid = arr.filter((f) => {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name} is not an image`);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} exceeds 5 MB`);
        return false;
      }
      return true;
    });
    if (valid.length === 0) return;
    setLocalPreviews((prev) => [
      ...prev,
      ...valid.map((f) => ({ file: f, preview: URL.createObjectURL(f) })),
    ]);
  };

  const handleUpload = async () => {
    if (localPreviews.length === 0) return;
    try {
      await uploadMutation.mutateAsync({
        scheduleId,
        studentId: student.studentId,
        files: localPreviews.map((p) => p.file),
      });
      toast.success(`${localPreviews.length} page(s) uploaded`);
      localPreviews.forEach((p) => URL.revokeObjectURL(p.preview));
      setLocalPreviews([]);
      refetchImages();
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    }
  };

  const handleComplete = async () => {
    try {
      await completeMutation.mutateAsync({
        scheduleId,
        studentId: student.studentId,
      });
      toast.success("Upload marked as complete");
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to complete";
      toast.error(msg);
    }
  };

  const removeLocalPreview = (idx: number) => {
    setLocalPreviews((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden transition-all">
      {/* Header Row */}
      <button
        onClick={isUploader ? onToggle : undefined}
        className={`w-full flex items-center gap-3 p-3.5 hover:bg-muted/30 transition-colors text-left ${!isUploader && 'cursor-default'}`}
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
          {student.studentName.charAt(0)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{student.studentName}</p>
          <p className="text-xs text-muted-foreground font-mono">{student.enrollmentNumber || "—"}</p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {cfg ? (
            <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${cfg.color}`}>
              {cfg.label}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded-full">Not Uploaded</span>
          )}
          {canEvaluate && student.answerSheetId && (
            <Button
              size="sm"
              variant={isFinal ? "outline" : "default"}
              className="gap-1 text-xs h-7 ml-2"
              onClick={(e) => {
                e.stopPropagation();
                onEvaluate(student.studentId, student.answerSheetId!);
              }}
            >
              <FileCheck className="w-3.5 h-3.5" />
              {isFinal ? "View" : "Evaluate"}
            </Button>
          )}
          {isUploader && (
            isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground ml-2" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground ml-2" />
            )
          )}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && isUploader && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/40 p-4 space-y-4">
              {/* Already uploaded pages */}
              {imageGroup?.pages && imageGroup.pages.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Uploaded Pages ({imageGroup.pages.length})
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {imageGroup.pages.map((page) => (
                      <div
                        key={page.pageNumber}
                        className="relative shrink-0 w-20 h-28 rounded-lg border border-border/50 overflow-hidden bg-muted/20 group"
                      >
                        <img
                          src={page.imageUrl}
                          alt={`Page ${page.pageNumber}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-0.5 font-medium">
                          Page {page.pageNumber}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Local previews (pending upload) */}
              {localPreviews.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Pending Upload ({localPreviews.length})
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {localPreviews.map((p, idx) => (
                      <div
                        key={idx}
                        className="relative shrink-0 w-20 h-28 rounded-lg border-2 border-dashed border-primary/30 overflow-hidden bg-primary/5 group"
                      >
                        <img
                          src={p.preview}
                          alt={`Preview ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeLocalPreview(idx)}
                          className="absolute top-0.5 right-0.5 p-0.5 bg-destructive/90 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-0 inset-x-0 bg-primary/70 text-white text-[10px] text-center py-0.5 font-medium">
                          New {idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Controls */}
              {!isFinal && isUploader && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* File Picker */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) handleFilesSelected(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="w-3.5 h-3.5" /> Add Images
                  </Button>

                  {/* Camera Capture */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) handleFilesSelected(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera className="w-3.5 h-3.5" /> Camera
                  </Button>

                  {/* Upload Pending */}
                  {localPreviews.length > 0 && (
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs bg-sky-600 hover:bg-sky-700"
                      disabled={uploadMutation.isPending}
                      onClick={handleUpload}
                    >
                      {uploadMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UploadIcon className="w-3.5 h-3.5" />
                      )}
                      Upload {localPreviews.length} Page(s)
                    </Button>
                  )}

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Mark Complete */}
                  {status === "UPLOADED" && (imageGroup?.pages?.length ?? 0) > 0 && (
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700"
                      disabled={completeMutation.isPending}
                      onClick={handleComplete}
                    >
                      {completeMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      Mark Complete
                    </Button>
                  )}
                </div>
              )}

              {/* Final Lock Message */}
              {isFinal && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-500/10 rounded-lg px-3 py-2">
                  <Lock className="w-3.5 h-3.5" />
                  Evaluation published — no further uploads allowed
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Step 3: Evaluation View (Image + Annotations + Marks) ───────────

function EvaluationView({
  scheduleId,
  answerSheetId,
  studentId,
  onBack,
}: {
  scheduleId: number;
  answerSheetId: number;
  studentId: string;
  onBack: () => void;
}) {
  const { data: structure, isLoading: structureLoading, error: structureError } = useEvaluationStructure(answerSheetId);
  const { data: imageGroup, isLoading: imagesLoading } = useAnswerSheetImages(studentId, scheduleId);
  const { data: annotations = [], refetch: refetchAnnotations } = useAnswerSheetAnnotations(answerSheetId);
  const createAnnotation = useCreateAnnotation();
  const saveMutation = useSaveDraftMarks();
  const submitMutation = useSubmitMarks();

  // Students list for fast switching
  const { data: students = [] } = useEvaluationStudents(scheduleId);

  const [marks, setMarks] = useState<Record<string, string>>({});
  const [lastSaveResult, setLastSaveResult] = useState<EvaluationResultResponseDTO | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [annotationTool, setAnnotationTool] = useState<"TICK" | "CROSS" | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  
  const status = structure?.resultStatus;
  const isFinal = status === "SUBMITTED" || status === "APPROVED" || status === "PUBLISHED";
  const isRejected = status === "REJECTED";

  // Refs for stable debounced save
  const marksRef = useRef(marks);
  marksRef.current = marks;
  const structureRef = useRef(structure);
  structureRef.current = structure;

  const pages = imageGroup?.pages ?? [];
  const currentImageUrl = pages.find((p) => p.pageNumber === currentPage)?.imageUrl || null;
  const pageAnnotations = annotations.filter((a) => a.pageNumber === currentPage);

  // Reset state when answerSheetId changes (student switching)
  useEffect(() => {
    setMarks({});
    setInitialized(false);
    setCurrentPage(1);
    setScale(1.0);
    setSaveStatus("idle");
  }, [answerSheetId]);

  // Initialize marks from server
  useEffect(() => {
    if (!structure || initialized) return;
    const initial: Record<string, string> = {};
    structure.sections.forEach((section) => {
      section.questions.forEach((q) => {
        if (q.type === "INTERNAL_CHOICE" && q.options) {
          q.options.forEach(opt => {
            if (opt.marksObtained != null) {
              const key = `${section.sectionName}#${q.questionNumber}#${opt.label}`;
              initial[key] = String(opt.marksObtained);
            }
          });
        } else {
          const key = `${section.sectionName}#${q.questionNumber}`;
          if (q.marksObtained != null) {
            initial[key] = String(q.marksObtained);
          }
        }
      });
    });
    setMarks(initial);
    setInitialized(true);
  }, [structure, initialized]);

  // Build payload from refs
  const buildPayloadFromRefs = useCallback((): SaveQuestionMarkRequestDTO[] => {
    const currentStructure = structureRef.current;
    const currentMarks = marksRef.current;
    if (!currentStructure) return [];
    const items: SaveQuestionMarkRequestDTO[] = [];
    currentStructure.sections.forEach((section) => {
      section.questions.forEach((q) => {
        if (q.type === "INTERNAL_CHOICE" && q.options) {
          q.options.forEach(opt => {
            const key = `${section.sectionName}#${q.questionNumber}#${opt.label}`;
            const val = currentMarks[key];
            if (val !== undefined && val !== "") {
              items.push({
                sectionName: section.sectionName,
                questionNumber: q.questionNumber,
                optionLabel: opt.label,
                marksObtained: parseFloat(val),
              });
            }
          });
        } else {
          const key = `${section.sectionName}#${q.questionNumber}`;
          const val = currentMarks[key];
          if (val !== undefined && val !== "") {
            items.push({
              sectionName: section.sectionName,
              questionNumber: q.questionNumber,
              marksObtained: parseFloat(val),
            });
          }
        }
      });
    });
    return items;
  }, []);

  const buildPayload = useCallback((): SaveQuestionMarkRequestDTO[] => {
    if (!structure) return [];
    const items: SaveQuestionMarkRequestDTO[] = [];
    structure.sections.forEach((section) => {
      section.questions.forEach((q) => {
        if (q.type === "INTERNAL_CHOICE" && q.options) {
          q.options.forEach(opt => {
            const key = `${section.sectionName}#${q.questionNumber}#${opt.label}`;
            const val = marks[key];
            if (val !== undefined && val !== "") {
              items.push({
                sectionName: section.sectionName,
                questionNumber: q.questionNumber,
                optionLabel: opt.label,
                marksObtained: parseFloat(val),
              });
            }
          });
        } else {
          const key = `${section.sectionName}#${q.questionNumber}`;
          const val = marks[key];
          if (val !== undefined && val !== "") {
            items.push({
              sectionName: section.sectionName,
              questionNumber: q.questionNumber,
              marksObtained: parseFloat(val),
            });
          }
        }
      });
    });
    return items;
  }, [structure, marks]);

  // Autosave — 1s debounce
  const triggerAutoSave = useCallback(() => {
    if (isFinal) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (savingRef.current) return;
      const questionMarks = buildPayloadFromRefs();
      if (questionMarks.length === 0) return;
      savingRef.current = true;
      setSaveStatus("saving");
      try {
        const result = await saveMutation.mutateAsync({
          answerSheetId,
          data: { questionMarks },
        });
        setLastSaveResult(result);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
      } finally {
        savingRef.current = false;
      }
    }, 1000);
  }, [answerSheetId, buildPayloadFromRefs, isFinal, saveMutation]);

  const handleMarkChange = (key: string, maxMarks: number, value: string) => {
    if (isFinal) return;
    let val = value;
    if (val !== "") {
      const num = parseFloat(val);
      if (num < 0) val = "0";
      if (num > maxMarks) val = String(maxMarks);
    }
    setMarks((prev) => ({ ...prev, [key]: val }));
    triggerAutoSave();
  };

  // Annotation click handler
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!annotationTool || isFinal) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      createAnnotation.mutate(
        {
          answerSheetId,
          data: {
            pageNumber: currentPage,
            x: Math.round(x * 100) / 100,
            y: Math.round(y * 100) / 100,
            type: annotationTool as AnnotationType,
          },
        },
        {
          onSuccess: () => refetchAnnotations(),
        }
      );
    },
    [annotationTool, answerSheetId, currentPage, isFinal, createAnnotation, refetchAnnotations]
  );

  const handleSubmit = async () => {
    const questionMarks = buildPayload();
    if (questionMarks.length === 0) {
      toast.error("Please enter marks before submitting");
      return;
    }
    try {
      const result = await saveMutation.mutateAsync({ answerSheetId, data: { questionMarks } });
      setLastSaveResult(result);
      await submitMutation.mutateAsync(answerSheetId);
      toast.success("Marks submitted for review successfully! Editing is now locked.");
      setPublishDialogOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submit failed";
      toast.error(msg);
    }
  };

  // Totals
  const totals = useMemo(() => {
    if (!structure) return { current: 0, max: 0, total: 0, filled: 0 };
    if (lastSaveResult) {
      // Use backend truth if available
      return {
        current: lastSaveResult.totalMarks,
        max: structure.totalMaxMarks,
        total: structure.totalQuestions,
        filled: lastSaveResult.selectedQuestions ? Object.values(lastSaveResult.selectedQuestions).reduce((acc: number, arr: string[]) => acc + arr.length, 0) : 0,
      };
    }
    // Fallback local calc
    let current = 0;
    let max = 0;
    let total = 0;
    let filled = 0;
    structure.sections.forEach((section) => {
      section.questions.forEach((q) => {
        total++;
        max += q.maxMarks;
        if (q.type === "INTERNAL_CHOICE" && q.options) {
          let maxOptMark = 0;
          let anyFilled = false;
          q.options.forEach(opt => {
            const key = `${section.sectionName}#${q.questionNumber}#${opt.label}`;
            const val = parseFloat(marks[key]);
            if (!isNaN(val)) {
              if (val > maxOptMark) maxOptMark = val;
              anyFilled = true;
            }
          });
          current += maxOptMark;
          if (anyFilled) filled++;
        } else {
          const key = `${section.sectionName}#${q.questionNumber}`;
          const val = parseFloat(marks[key]);
          if (!isNaN(val)) {
            current += val;
            filled++;
          }
        }
      });
    });
    return { current, max, total, filled };
  }, [structure, marks, lastSaveResult]);

  // Student switcher
  const currentStudentIdx = students.findIndex((s) => s.studentId === studentId);

  // Detect "uploads not completed" 403 vs other errors
  const isUploadsIncomplete = useMemo(() => {
    if (!structureError) return false;
    const errResponse = (structureError as { response?: { status?: number; data?: { message?: string } } })?.response;
    return (
      errResponse?.status === 403 &&
      (errResponse?.data?.message?.toLowerCase().includes("uploader") ?? false)
    );
  }, [structureError]);

  // Upload progress stats
  const uploadStats = useMemo(() => {
    const total = students.length;
    const uploaded = students.filter((s) => s.answerSheetStatus).length;
    const complete = students.filter(
      (s) => s.answerSheetStatus === "COMPLETE" || s.answerSheetStatus === "DRAFT" || 
             s.answerSheetStatus === "CHECKING" || s.answerSheetStatus === "FINAL"
    ).length;
    return { total, uploaded, complete, remaining: total - uploaded };
  }, [students]);

  if (structureLoading || imagesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Friendly "Waiting for Uploads" view
  if (isUploadsIncomplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5 p-8 text-center space-y-5"
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <UploadIcon className="w-8 h-8 text-amber-600" />
            </motion.div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-400">
              Waiting for Uploads
            </h3>
            <p className="text-sm text-amber-700/80 dark:text-amber-400/60 mt-1">
              The assigned uploader hasn&apos;t finished uploading all answer sheets yet.
              Evaluation will be available once uploads are marked complete.
            </p>
          </div>

          {/* Progress stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Uploaded", value: uploadStats.uploaded, color: "text-amber-700 dark:text-amber-400" },
              { label: "Ready", value: uploadStats.complete, color: "text-teal-600" },
              { label: "Pending", value: uploadStats.remaining, color: "text-muted-foreground" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/60 dark:bg-white/5 border border-amber-200/50 dark:border-amber-500/10 p-3">
                <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
                <p className="text-[10px] uppercase tracking-wider text-amber-600/70 font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {uploadStats.total > 0 && (
            <div className="w-full bg-amber-200/50 dark:bg-amber-500/10 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-amber-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(uploadStats.uploaded / uploadStats.total) * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          )}

          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Button>
        </motion.div>
      </div>
    );
  }

  if (!structure) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="font-semibold">Could not load evaluation structure</p>
        <p className="text-sm text-muted-foreground">The exam schedule may not have a template snapshot.</p>
        <Button variant="outline" onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-20 p-3 rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left: Scores */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Score</span>
              <span className="text-xl font-bold tabular-nums">
                <span className="text-primary">{totals.current.toFixed(1)}</span>
                <span className="text-muted-foreground/60 text-sm font-normal"> / {totals.max}</span>
              </span>
            </div>
            <div className="h-8 w-px bg-border/50" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Progress</span>
              <span className="text-sm font-medium tabular-nums">{totals.filled}/{totals.total}</span>
            </div>
            <div className="h-8 w-px bg-border/50" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</span>
              {status === "PUBLISHED" ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                  <Lock className="w-3 h-3" /> Published
                </span>
              ) : status === "APPROVED" ? (
                <span className="inline-flex items-center gap-1 text-xs text-teal-700 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Approved
                </span>
              ) : status === "SUBMITTED" ? (
                <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium">
                  <Clock className="w-3 h-3" /> Submitted
                </span>
              ) : isRejected ? (
                <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                  <AlertCircle className="w-3 h-3" /> Rejected (Edit)
                </span>
              ) : (
                <SaveIndicator status={saveStatus} />
              )}
            </div>
          </div>

          {/* Center: Student Switcher */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentStudentIdx <= 0}
              onClick={() => {
                // Simple prev logic
                if (currentStudentIdx > 0) {
                  const prevStudent = students[currentStudentIdx - 1];
                  if (prevStudent?.answerSheetId) {
                    window.location.search = `?scheduleId=${scheduleId}&studentId=${prevStudent.studentId}&answerSheetId=${prevStudent.answerSheetId}`;
                  }
                }
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-xs font-medium px-2 py-1 rounded-md bg-muted/50 min-w-[120px] text-center truncate">
              {students[currentStudentIdx]?.studentName || "Student"}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={currentStudentIdx >= students.length - 1}
              onClick={() => {
                if (currentStudentIdx < students.length - 1) {
                  const nextStudent = students[currentStudentIdx + 1];
                  if (nextStudent?.answerSheetId) {
                    window.location.search = `?scheduleId=${scheduleId}&studentId=${nextStudent.studentId}&answerSheetId=${nextStudent.answerSheetId}`;
                  }
                }
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {!isFinal && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const questionMarks = buildPayload();
                    if (questionMarks.length > 0) {
                      setSaveStatus("saving");
                      saveMutation
                        .mutateAsync({ answerSheetId, data: { questionMarks } })
                        .then((result) => {
                          setLastSaveResult(result);
                          setSaveStatus("saved");
                          toast.success("Draft saved");
                          setTimeout(() => setSaveStatus("idle"), 2000);
                        })
                        .catch(() => {
                          setSaveStatus("error");
                        });
                    }
                  }}
                  disabled={saveMutation.isPending}
                  className="gap-1.5 text-xs"
                >
                  <Save className="w-3.5 h-3.5" /> Save Draft
                </Button>
                <Button
                  size="sm"
                  onClick={() => setPublishDialogOpen(true)}
                  disabled={submitMutation.isPending}
                  className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white border-transparent"
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowLeft className="w-3.5 h-3.5 rotate-90" />
                  )}
                  Submit for Review
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Layout: Image Viewer (70%) + Marks Panel (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-[70%_1fr] gap-4">
        {/* LEFT: Image Viewer + Annotations */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden flex flex-col">
          {/* Image Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-muted/30">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium tabular-nums min-w-[60px] text-center">
                {currentPage} / {pages.length || "–"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage >= pages.length}
                onClick={() => setCurrentPage((p) => Math.min(pages.length, p + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Annotation Tools */}
            <div className="flex items-center gap-1">
              <Button
                variant={annotationTool === "TICK" ? "default" : "ghost"}
                size="sm"
                className={`h-7 text-xs gap-1 ${annotationTool === "TICK" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                onClick={() => setAnnotationTool(annotationTool === "TICK" ? null : "TICK")}
                disabled={isFinal}
              >
                <Check className="w-3.5 h-3.5" /> ✓
              </Button>
              <Button
                variant={annotationTool === "CROSS" ? "default" : "ghost"}
                size="sm"
                className={`h-7 text-xs gap-1 ${annotationTool === "CROSS" ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
                onClick={() => setAnnotationTool(annotationTool === "CROSS" ? null : "CROSS")}
                disabled={isFinal}
              >
                <X className="w-3.5 h-3.5" /> ✗
              </Button>
              <div className="h-5 w-px bg-border/50 mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <span className="text-[10px] font-medium tabular-nums min-w-[36px] text-center text-muted-foreground">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setScale((s) => Math.min(3, s + 0.2))}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Image + Annotation Overlay */}
          <div className="flex-1 overflow-auto bg-muted/10 min-h-[500px] max-h-[80vh] flex justify-center p-4">
            {currentImageUrl ? (
              <div
                className="relative inline-block image-viewer-container"
                style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
              >
                <img
                  src={currentImageUrl}
                  alt={`Answer sheet page ${currentPage}`}
                  className="max-w-full h-auto select-none rounded-sm shadow-md"
                  draggable={false}
                />
                {/* Annotation Canvas Overlay */}
                <div
                  className="annotation-canvas"
                  onClick={handleCanvasClick}
                  style={{ cursor: annotationTool ? "crosshair" : "default" }}
                >
                  {pageAnnotations.map((ann) => (
                    <AnnotationMarker key={ann.id} annotation={ann} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground min-h-[400px]">
                <Eye className="w-10 h-10 opacity-30" />
                <p className="text-sm">No image for this page</p>
              </div>
            )}
          </div>

          {/* Page Thumbnails */}
          {pages.length > 1 && (
            <div className="border-t border-border/40 bg-muted/20 p-2 flex gap-1.5 overflow-x-auto">
              {pages.map((page) => (
                <button
                  key={page.pageNumber}
                  onClick={() => setCurrentPage(page.pageNumber)}
                  className={`shrink-0 w-14 h-20 rounded-md border-2 overflow-hidden transition-all ${
                    currentPage === page.pageNumber
                      ? "border-primary shadow-md"
                      : "border-transparent hover:border-border/60"
                  }`}
                >
                  <img
                    src={page.imageUrl}
                    alt={`Page ${page.pageNumber}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Marks Panel */}
        <div className="space-y-3 max-h-[85vh] overflow-y-auto pr-1 eval-marks-panel">
          {structure.sections.map((section, sIdx) => {
            const isOptional = section.sectionType === "OPTIONAL";
            const selectedQIds = lastSaveResult?.selectedQuestions?.[section.sectionName] || [];
            const isSectionEvaluated = selectedQIds.length > 0 || (lastSaveResult && !isOptional);
            
            // For UI summary of ignored questions
            const allQIds = section.questions.map(q => `Q${q.questionNumber}`);
            const ignoredQIds = isOptional ? allQIds.filter(id => !selectedQIds.includes(id)) : [];

            return (
              <motion.div
                key={section.sectionName}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: sIdx * 0.04 }}
                className="rounded-xl border border-border/50 bg-card overflow-hidden"
              >
                {/* Section Header */}
                <div className="bg-muted/40 p-2.5 px-3.5 border-b border-border/50 flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                      <span className="bg-primary/10 text-primary w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold">
                        {String.fromCharCode(65 + sIdx)}
                      </span>
                      {section.sectionName}
                      {isOptional && section.attemptQuestions && (
                        <span className="text-[10px] font-normal text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/50 shadow-sm ml-1">
                          Attempt any {section.attemptQuestions} out of {section.totalQuestions || section.questions.length}
                        </span>
                      )}
                    </h4>
                    {section.helperText && (
                      <p className="text-[10px] text-muted-foreground mt-1 ml-7 italic">
                        {section.helperText}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-medium bg-background px-1.5 py-0.5 rounded border border-border/50 tabular-nums shrink-0 mt-0.5">
                    {section.questions.length}Q × {section.questions[0]?.maxMarks ?? 0}m
                  </span>
                </div>

                {/* Questions Grid */}
                <div className="p-3 grid grid-cols-1 gap-y-3">
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-x-3 gap-y-2.5">
                    {section.questions.map((q) => {
                      if (q.type === "INTERNAL_CHOICE" && q.options) {
                        return (
                          <div key={q.questionNumber} className="col-span-full rounded-md border border-border/40 p-2 space-y-2 relative bg-muted/5">
                            <label className="text-[11px] font-semibold text-foreground flex justify-between bg-muted/30 px-2 py-1 rounded">
                              <span className="flex items-center gap-1.5">
                                Q{q.questionNumber} 
                                <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 rounded-[3px] text-[9px] uppercase tracking-wider">Attempt any ONE</span>
                              </span>
                              <span className="opacity-70">/{q.maxMarks}</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3 pl-1">
                              {q.options.map((opt) => {
                                const key = `${section.sectionName}#${q.questionNumber}#${opt.label}`;
                                const val = marks[key] ?? "";
                                const num = parseFloat(val);
                                const isValid = val === "" || (!isNaN(num) && num >= 0 && num <= opt.maxMarks);
                                const isSelected = selectedQIds.includes(`Q${q.questionNumber}(${opt.label})`);

                                return (
                                  <div key={opt.label} className="flex flex-col gap-0.5">
                                    <label className="text-[10px] font-medium text-muted-foreground flex justify-between items-center bg-background px-1 rounded-sm">
                                      <span className="flex items-center gap-1">
                                        ({opt.label})
                                        {isSelected && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                      </span>
                                      <span className="opacity-50">/{opt.maxMarks}</span>
                                    </label>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={opt.maxMarks}
                                      step={0.5}
                                      placeholder="–"
                                      disabled={isFinal}
                                      className={`h-8 text-center text-sm font-medium bg-muted/20 focus:bg-background transition-colors placeholder:text-muted-foreground/30 tabular-nums ${
                                        !isValid ? "border-destructive/60 bg-destructive/5" : ""
                                      } ${isSelected ? "border-emerald-500/50 bg-emerald-500/5" : ""}`}
                                      value={val}
                                      onChange={(e) => handleMarkChange(key, opt.maxMarks, e.target.value)}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      // NORMAL TYPE
                      const key = `${section.sectionName}#${q.questionNumber}`;
                      const val = marks[key] ?? "";
                      const num = parseFloat(val);
                      const isValid = val === "" || (!isNaN(num) && num >= 0 && num <= q.maxMarks);
                      const isSelected = selectedQIds.includes(`Q${q.questionNumber}`);

                      return (
                        <div key={q.questionNumber} className="flex flex-col gap-0.5">
                          <label className="text-[10px] font-medium text-muted-foreground flex justify-between items-center">
                            <span className="flex items-center gap-1">
                              Q{q.questionNumber}
                              {isSelected && isOptional && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                            </span>
                            <span className="opacity-50">/{q.maxMarks}</span>
                          </label>
                          <Input
                            type="number"
                            min={0}
                            max={q.maxMarks}
                            step={0.5}
                            placeholder="–"
                            disabled={isFinal}
                            className={`h-8 text-center text-sm font-medium bg-muted/20 focus:bg-background transition-colors placeholder:text-muted-foreground/30 tabular-nums ${
                              !isValid ? "border-destructive/60 bg-destructive/5" : ""
                            } ${isSelected && isOptional ? "border-emerald-500/50 bg-emerald-500/5 shadow-sm" : ""}`}
                            value={val}
                            onChange={(e) => handleMarkChange(key, q.maxMarks, e.target.value)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section Footer (Optional Feedback & Subtotal) */}
                <div className="bg-muted/30 border-t border-border/40 px-3.5 py-3 flex flex-col gap-2.5 text-xs">
                  {isOptional && isSectionEvaluated && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 bg-background px-3 py-2 rounded-md border border-border/60 shadow-sm">
                      <span className="flex items-center gap-1.5 text-emerald-600 font-medium whitespace-nowrap">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Selected: <span className="text-foreground">{selectedQIds.join(", ") || "None"}</span>
                      </span>
                      {ignoredQIds.length > 0 && (
                        <span className="flex items-center gap-1.5 text-muted-foreground font-medium whitespace-nowrap">
                          <X className="w-3.5 h-3.5 text-destructive/60" /> Ignored: <span className="text-foreground/80">{ignoredQIds.join(", ")}</span>
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between items-center px-1">
                    <span className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Section Total</span>
                    <span className="font-bold tabular-nums text-sm">
                      {lastSaveResult?.sectionTotals?.[section.sectionName]?.toFixed(1) ?? "0.0"}
                      <span className="text-muted-foreground/60 font-normal ml-1">
                        / {isOptional ? (section.attemptQuestions ?? 0) * (section.questions[0]?.maxMarks ?? 0) : section.questions.reduce((sum, q) => sum + q.maxMarks, 0)}
                      </span>
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Grand Total Card */}
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Grand Total</p>
            <p className="text-3xl font-bold tabular-nums">
              <span className="text-primary">{totals.current.toFixed(1)}</span>
              <span className="text-muted-foreground/50 text-lg font-normal"> / {totals.max}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{totals.filled} of {totals.total} answered</p>
          </div>
        </div>
      </div>

      {/* Submit Confirmation */}
      <AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit for Admin Review?</AlertDialogTitle>
            <AlertDialogDescription>
              This will submit the marks to the administration for approval. 
              <strong> You will not be able to edit this unless it is rejected.</strong>
              <br /><br />
              Total marks: <strong>{totals.current.toFixed(1)} / {totals.max}</strong>
              <br />
              Questions answered: <strong>{totals.filled} / {totals.total}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit for Review
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Annotation Marker ───────────────────────────────────────────────

function AnnotationMarker({ annotation }: { annotation: AnnotationResponseDTO }) {
  const isCheck = annotation.type === "TICK";
  return (
    <div
      className={`annotation-marker ${isCheck ? "annotation-tick" : "annotation-cross"}`}
      style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
    >
      {isCheck ? "✓" : "✗"}
    </div>
  );
}

// ── Save Status Indicator ───────────────────────────────────────────

function SaveIndicator({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "saving")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground animate-pulse">
        <Loader2 className="w-3 h-3 animate-spin" /> Saving...
      </span>
    );
  if (status === "saved")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
        <CheckCircle2 className="w-3 h-3" /> Saved
      </span>
    );
  if (status === "error")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium">
        <XCircle className="w-3 h-3" /> Save failed
      </span>
    );
  return <span className="text-xs text-muted-foreground/60">Draft</span>;
}
