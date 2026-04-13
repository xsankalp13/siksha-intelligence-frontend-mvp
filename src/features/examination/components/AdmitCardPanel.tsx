import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  Settings2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Users,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Send,
  Zap,
  XCircle,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  useGetAllExams,
  useGenerateAdmitCards,
  useGenerateAdmitCardsForSchedule,
  useGetAdmitCardStatus,
  useGetGenerationProgress,
  usePublishAdmitCards,
  usePublishAdmitCardsForSchedules,
} from "../hooks/useExaminationQueries";
import { examinationService } from "@/services/examination";
import type { ScheduleAdmitCardStatusDTO } from "@/services/types/examination";
import type { AdmitCardStatusEnum } from "@/services/types/examination";

// ── Helper: group schedule statuses by className ──────────────────
interface ClassGroup {
  className: string;
  sectionName?: string;
  schedules: ScheduleAdmitCardStatusDTO[];
  totalStudents: number;
  totalGeneratedCards: number;
  totalSubjects: number;
  generatedSubjects: number;
  allGenerated: boolean;
  publishedSubjects: number;
  allPublished: boolean;
}

function groupByClass(statuses: ScheduleAdmitCardStatusDTO[]): ClassGroup[] {
  const map = new Map<string, ScheduleAdmitCardStatusDTO[]>();
  for (const s of statuses) {
    const key = s.className + (s.sectionName ? ` - ${s.sectionName}` : "");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }

  return Array.from(map.entries()).map(([, schedules]) => {
    const generatedSubjects = schedules.filter((s) => s.allGenerated).length;
    const publishedSubjects = schedules.filter((s) => s.allPublished).length;
    const totalStudents = Math.max(
      ...schedules.map((s) => s.totalStudents),
      0
    );
    const totalGeneratedCards = Math.max(...schedules.map(s => s.generatedCount), 0);
    return {
      className: schedules[0].className,
      sectionName: schedules[0].sectionName,
      schedules,
      totalStudents,
      totalGeneratedCards,
      totalSubjects: schedules.length,
      generatedSubjects,
      allGenerated: generatedSubjects === schedules.length,
      publishedSubjects,
      allPublished: publishedSubjects === schedules.length,
    };
  });
}

// ── Status badge helper ───────────────────────────────────────────
function StatusBadge({ status }: { status: AdmitCardStatusEnum }) {
  const map: Record<
    AdmitCardStatusEnum,
    { label: string; className: string; icon: React.ElementType }
  > = {
    DRAFT: {
      label: "Draft",
      className:
        "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      icon: Clock,
    },
    GENERATING: {
      label: "Generating…",
      className:
        "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
      icon: Loader2,
    },
    GENERATED: {
      label: "Generated",
      className:
        "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400",
      icon: CheckCircle2,
    },
    FAILED: {
      label: "Failed",
      className:
        "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
      icon: XCircle,
    },
    PUBLISHED: {
      label: "Published",
      className:
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      icon: Send,
    },
  };

  const entry = map[status] ?? map.DRAFT;
  const Icon = entry.icon;

  return (
    <Badge variant="outline" className={`gap-1 ${entry.className}`}>
      <Icon
        className={`w-3 h-3 ${status === "GENERATING" ? "animate-spin" : ""}`}
      />
      {entry.label}
    </Badge>
  );
}

// ── Progress bar ──────────────────────────────────────────────────
function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────
export default function AdmitCardPanel() {
  const [selectedExamUuid, setSelectedExamUuid] = useState<string>("");
  const [isPolling, setIsPolling] = useState(false);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadingClass, setDownloadingClass] = useState<string | null>(null);

  // To prevent showing the "completed" toast on initial load
  const prevProgressStatus = useRef<AdmitCardStatusEnum | null>(null);

  const qc = useQueryClient();

  const { data: exams, isLoading: isLoadingExams } = useGetAllExams();
  const {
    data: scheduleStatuses,
    isLoading: isLoadingStatus,
    refetch: refetchStatus,
  } = useGetAdmitCardStatus(selectedExamUuid);
  const {
    data: progress,
  } = useGetGenerationProgress(selectedExamUuid, isPolling);

  const generateExamMutation = useGenerateAdmitCards();
  const generateScheduleMutation = useGenerateAdmitCardsForSchedule();
  const publishExamMutation = usePublishAdmitCards();
  const publishSchedulesMutation = usePublishAdmitCardsForSchedules();

  const selectedExam = exams?.find((e) => e.uuid === selectedExamUuid);

  const classGroups = useMemo(() => {
    if (!scheduleStatuses) return [];
    return groupByClass(scheduleStatuses);
  }, [scheduleStatuses]);

  const classKey = (g: ClassGroup) => g.className + (g.sectionName || "");

  // ── Derived state from progress ──────────────────────────────
  const currentStatus: AdmitCardStatusEnum =
    progress?.status ?? "DRAFT";
  const isGenerating = currentStatus === "GENERATING";
  const isGenerated = currentStatus === "GENERATED";
  const isFailed = currentStatus === "FAILED";
  const isPublished = currentStatus === "PUBLISHED";

  // ── Auto-start polling on exam selection & stop when terminal state
  useEffect(() => {
    if (!selectedExamUuid) {
      setIsPolling(false);
      return;
    }
    // Initially fetch progress to check if generation is in progress
    setIsPolling(true);
  }, [selectedExamUuid]);

  useEffect(() => {
    if (!progress) return;

    const status = progress.status;

    // Stop polling when terminal state reached
    if (
      status === "GENERATED" ||
      status === "FAILED" ||
      status === "PUBLISHED" ||
      status === "DRAFT"
    ) {
      // Small delay to allow final progress to render
      const timer = setTimeout(() => {
        setIsPolling(false);
        // Refresh schedule statuses when generation finishes
        if (status === "GENERATED" || status === "FAILED") {
          qc.invalidateQueries({
            queryKey: ["examination", "admit-card-status", selectedExamUuid],
          });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [progress, selectedExamUuid, qc]);

  // ── Toasts on progress transitions ──────────────────────────
  useEffect(() => {
    if (!progress) return;
    const prev = prevProgressStatus.current;
    const cur = progress.status;

    if (prev === "GENERATING" && cur === "GENERATED") {
      toast.success("✅ All admit cards generated successfully!");
    } else if (prev === "GENERATING" && cur === "FAILED") {
      toast.error(
        `⚠️ Some admit cards failed. Generated: ${progress.completedJobs}, Failed: ${progress.failedJobs}`,
        { duration: 6000 }
      );
    }
    prevProgressStatus.current = cur;
  }, [progress]);

  // ── Handlers ────────────────────────────────────────────────

  // Generate for entire exam (async, fire-and-forget)
  const handleGenerateExam = useCallback(async () => {
    if (!selectedExamUuid) return;
    try {
      await generateExamMutation.mutateAsync(selectedExamUuid);
      toast.info("🚀 Generation started. Tracking progress…");
      prevProgressStatus.current = "GENERATING";
      setIsPolling(true);
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || "Failed to start generation.";
      if (msg.includes("already in progress")) {
        toast.info("Generation is already in progress.");
        setIsPolling(true);
      } else {
        toast.error(msg);
      }
    }
  }, [selectedExamUuid, generateExamMutation]);

  // Generate for a single class (all its schedules, sequentially)
  const handleGenerateForClass = useCallback(
    async (group: ClassGroup) => {
      if (!selectedExamUuid) return;

      let successCount = 0;
      let lastError: string | null = null;

      for (const schedule of group.schedules) {
        try {
          await generateScheduleMutation.mutateAsync({
            examUuid: selectedExamUuid,
            scheduleId: schedule.scheduleId,
          });
          successCount++;
        } catch (error: any) {
          lastError =
            error?.response?.data?.message ||
            `Failed for ${schedule.subjectName}`;
        }
      }

      if (successCount > 0) {
        toast.info(
          `Generation started for ${group.className} (${successCount}/${group.schedules.length} subjects). Tracking progress…`
        );
        prevProgressStatus.current = "GENERATING";
        setIsPolling(true);
      }
      if (lastError && successCount < group.schedules.length) {
        toast.warning(lastError, { duration: 5000 });
      }
    },
    [selectedExamUuid, generateScheduleMutation]
  );

  // Publish all for exam
  const handlePublishExam = useCallback(async () => {
    if (!selectedExamUuid) return;
    try {
      await publishExamMutation.mutateAsync(selectedExamUuid);
      toast.success("🎉 Admit cards published successfully!");
      // Refresh everything
      qc.invalidateQueries({
        queryKey: ["examination", "admit-card-status", selectedExamUuid],
      });
      qc.invalidateQueries({
        queryKey: ["examination", "generation-progress", selectedExamUuid],
      });
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to publish admit cards."
      );
    }
  }, [selectedExamUuid, publishExamMutation, qc]);

  // Publish class-wise
  const handlePublishForClass = useCallback(
    async (group: ClassGroup) => {
      if (!selectedExamUuid) return;
      const scheduleIds = group.schedules
        .filter((s) => s.generatedCount > 0)
        .map((s) => s.scheduleId);

      if (scheduleIds.length === 0) {
        toast.error("No generated admit cards to publish for this class.");
        return;
      }
      try {
        await publishSchedulesMutation.mutateAsync({
          examUuid: selectedExamUuid,
          scheduleIds,
        });
        toast.success(
          `🚀 Published for ${group.className}${group.sectionName ? ` (${group.sectionName})` : ""}`
        );
      } catch (error: any) {
        toast.error(
          error?.response?.data?.message || "Failed to publish admit cards."
        );
      }
    },
    [selectedExamUuid, publishSchedulesMutation]
  );

  // Retry (re-generate entire exam)
  const handleRetryFailed = useCallback(async () => {
    await handleGenerateExam();
  }, [handleGenerateExam]);

  // Download All (PDF)
  const handleDownloadAllPdf = async () => {
    if (!selectedExamUuid) return;
    try {
      setIsDownloading(true);
      const response = await examinationService.downloadBatchAdmitCards({ examId: selectedExamUuid });
      const url = window.URL.createObjectURL(new Blob([response.data as any]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `admit-cards-${selectedExam?.name || selectedExamUuid}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Download started.");
    } catch {
      toast.error("Failed to download admit cards PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Download PDF per class
  const handleDownloadClassPdf = async (group: ClassGroup) => {
    if (!selectedExamUuid || group.schedules.length === 0) return;
    const key = classKey(group);
    try {
      setDownloadingClass(key);
      const response = await examinationService.downloadBatchAdmitCards({ 
        examId: selectedExamUuid, 
        scheduleId: group.schedules[0].scheduleId 
      });
      const url = window.URL.createObjectURL(new Blob([response.data as any]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `admit-cards-${group.className}${group.sectionName ? `-${group.sectionName}` : ""}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Download started for ${group.className}.`);
    } catch {
      toast.error(`Failed to download PDF for ${group.className}.`);
    } finally {
      setDownloadingClass(null);
    }
  };

  // ── Aggregate stats ─────────────────────────────────────────
  const totalStudents = classGroups.reduce(
    (sum, g) => sum + g.totalStudents,
    0
  );
  const totalGeneratedCards = classGroups.reduce(
    (sum, g) => sum + Math.max(...g.schedules.map((s) => s.generatedCount), 0),
    0
  );
  const overallProgressPercent = totalStudents > 0 ? Math.round((totalGeneratedCards / totalStudents) * 100) : 0;

  const totalClassesGenerated = classGroups.filter(
    (g) => g.allGenerated
  ).length;
  const totalClassesPublished = classGroups.filter(
    (g) => g.allPublished
  ).length;

  // Button enable/disable rules
  const canGenerate = !isGenerating && !generateExamMutation.isPending;
  const canPublish =
    isGenerated &&
    !isGenerating &&
    !publishExamMutation.isPending &&
    totalClassesGenerated > 0;
  const canDownload = isPublished && !isDownloading;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          Admit Card Management
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Generate admit cards asynchronously, then publish to make them visible
          to students.
        </p>
      </div>

      {/* Step 1: Select Exam */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-lg">Select Examination</CardTitle>
          <CardDescription>
            Choose an exam to generate or manage its admit cards.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="max-w-md">
            <Select
              value={selectedExamUuid}
              onValueChange={(val) => {
                setSelectedExamUuid(val);
                setExpandedClass(null);
                prevProgressStatus.current = null;
              }}
              disabled={isLoadingExams}
            >
              <SelectTrigger id="admit-card-exam-select">
                <SelectValue placeholder="Select an exam..." />
              </SelectTrigger>
              <SelectContent>
                {exams?.map((exam) => (
                  <SelectItem key={exam.uuid} value={exam.uuid}>
                    {exam.name} ({exam.academicYear})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Status Dashboard + Actions */}
      {selectedExam && (
        <>
          {/* ── Status Overview ─────────────────────────────────── */}
          <Card className="border-primary/20 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-bl-full -z-10" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Generation Status
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {selectedExam.name} — {selectedExam.academicYear}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={currentStatus} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      refetchStatus();
                      setIsPolling(true);
                    }}
                    disabled={isLoadingStatus}
                    className="gap-1.5 text-muted-foreground"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${isLoadingStatus ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-border/50 bg-muted/20 p-4 text-center">
                  <Users className="w-5 h-5 text-muted-foreground mx-auto mb-1.5" />
                  <div className="text-2xl font-bold text-foreground">
                    {totalStudents}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Students
                  </div>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/20 p-4 text-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
                  <div className="text-2xl font-bold text-foreground">
                    {totalGeneratedCards}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total Generated
                  </div>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/20 p-4 text-center">
                  <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1.5" />
                  <div className="text-2xl font-bold text-foreground">
                    {progress?.failedJobs ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/20 p-4 text-center">
                  <Send className="w-5 h-5 text-sky-500 mx-auto mb-1.5" />
                  <div className="text-2xl font-bold text-foreground">
                    {totalClassesPublished}/{classGroups.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Classes Published
                  </div>
                </div>
              </div>

              {/* Overall Progress Bar */}
              {totalStudents > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground font-medium">
                      Overall Progress
                    </span>
                    <span className="font-semibold text-foreground">
                      {overallProgressPercent}% ({totalGeneratedCards}/{totalStudents})
                    </span>
                  </div>
                  <ProgressBar value={overallProgressPercent} />
                </div>
              )}

              {/* Active Generation Queue Progress */}
              {isGenerating && progress && progress.totalJobs > 0 && (
                <div className="space-y-2 mt-4 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Active Queue Processing
                    </span>
                    <span className="font-semibold text-blue-700 dark:text-blue-300">
                      {progress.progressPercent}%
                    </span>
                  </div>
                  <ProgressBar value={progress.progressPercent} />
                  <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
                    {progress.completedJobs}/{progress.totalJobs} PDFs generated • {progress.pendingJobs} pending
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/40">
                <Button
                  id="admit-card-generate-btn"
                  onClick={handleGenerateExam}
                  disabled={!canGenerate}
                  className="gap-2 min-w-[140px]"
                >
                  {generateExamMutation.isPending || isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isGenerating ? "Generating…" : "Starting…"}
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Generate All
                    </>
                  )}
                </Button>

                <Button
                  id="admit-card-publish-btn"
                  variant="secondary"
                  onClick={handlePublishExam}
                  disabled={!canPublish}
                  className={`gap-2 min-w-[130px] ${
                    canPublish
                      ? "bg-sky-500 hover:bg-sky-600 text-white border-0"
                      : ""
                  }`}
                >
                  {publishExamMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Publish All
                </Button>

                <Button
                  id="admit-card-download-btn"
                  variant="outline"
                  onClick={handleDownloadAllPdf}
                  disabled={!canDownload}
                  className="gap-2 min-w-[140px]"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download All (PDF)
                </Button>
              </div>

              {/* Publish hint */}
              {isGenerated && !isPublished && (
                <Alert className="border-sky-500/30 bg-sky-500/5">
                  <CheckCircle2 className="h-4 w-4 text-sky-500" />
                  <AlertTitle>Ready to Publish</AlertTitle>
                  <AlertDescription className="text-xs">
                    All admit cards have been generated. Click "Publish All" to
                    make them visible to students.
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Section */}
              {isFailed && progress && progress.failedJobs > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Some Admit Cards Failed</AlertTitle>
                  <AlertDescription>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-2">
                      <div className="text-sm space-y-0.5">
                        <p>
                          Generated:{" "}
                          <span className="font-semibold">
                            {progress.completedJobs}
                          </span>
                        </p>
                        <p>
                          Failed:{" "}
                          <span className="font-semibold">
                            {progress.failedJobs}
                          </span>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleRetryFailed}
                        disabled={generateExamMutation.isPending}
                        className="gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Retry Failed
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* ── Class-wise Breakdown ──────────────────────────── */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Class-wise Breakdown
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Generate or publish for individual classes. Expand to see
                    per-subject details.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingStatus ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading class data...
                </div>
              ) : classGroups.length === 0 ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Schedules Found</AlertTitle>
                  <AlertDescription className="text-xs">
                    No exam schedules exist for this exam. Please add schedules
                    first in the "Exams & Schedules" tab.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {classGroups.map((group, index) => {
                    const key = classKey(group);
                    const isExpanded = expandedClass === key;
                    const isBusy = isGenerating;

                    return (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className={`rounded-xl border transition-all duration-200 ${
                          group.allPublished
                            ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                            : group.allGenerated
                              ? "border-sky-500/30 bg-sky-500/[0.01]"
                              : "border-border/60 hover:border-border"
                        }`}
                      >
                        {/* Class row */}
                        <div className="flex items-center gap-4 px-5 py-4">
                          {/* Expand toggle */}
                          <button
                            onClick={() =>
                              setExpandedClass(isExpanded ? null : key)
                            }
                            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>

                          {/* Class info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-foreground text-[15px]">
                              {group.className}
                              {group.sectionName && (
                                <span className="text-muted-foreground font-normal ml-1.5">
                                  — {group.sectionName}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {group.totalStudents} students
                              </span>
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5" />
                                {group.totalSubjects} subjects
                              </span>
                            </div>
                          </div>

                          {/* Status */}
                          <div className="shrink-0">
                            {group.allPublished ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Published
                              </Badge>
                            ) : group.allGenerated ? (
                              <Badge
                                variant="outline"
                                className="border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400 gap-1"
                              >
                                <FileText className="w-3 h-3" />
                                Generated (Draft)
                              </Badge>
                            ) : group.totalGeneratedCards > 0 ? (
                              <Badge
                                variant="outline"
                                className="border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400 gap-1"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                Partial ({group.totalGeneratedCards}/{group.totalStudents})
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1"
                              >
                                <Clock className="w-3 h-3" />
                                Pending
                              </Badge>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            {group.allPublished && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadClassPdf(group)}
                                disabled={isBusy || downloadingClass === key}
                                className="gap-1.5 min-w-[125px]"
                              >
                                {downloadingClass === key ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                                Download PDF
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant={
                                group.allGenerated ? "outline" : "default"
                              }
                              onClick={() => handleGenerateForClass(group)}
                              disabled={isBusy || generateScheduleMutation.isPending}
                              className="gap-1.5 min-w-[110px]"
                            >
                              {generateScheduleMutation.isPending ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Starting…
                                </>
                              ) : group.allGenerated ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Regenerate
                                </>
                              ) : (
                                <>
                                  <Settings2 className="w-3.5 h-3.5" />
                                  Generate
                                </>
                              )}
                            </Button>

                            {!group.allPublished && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handlePublishForClass(group)}
                                disabled={
                                  isBusy ||
                                  group.totalGeneratedCards === 0 ||
                                  publishSchedulesMutation.isPending
                                }
                                className={`gap-1.5 min-w-[100px] ${
                                  group.totalGeneratedCards > 0 &&
                                  !isBusy &&
                                  !isFailed
                                    ? "bg-sky-500 hover:bg-sky-600 text-white border-0"
                                    : "opacity-50"
                                }`}
                              >
                                {publishSchedulesMutation.isPending ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                                Publish
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Expanded: subject details */}
                        {isExpanded && (
                          <div className="border-t border-border/40 bg-muted/20 px-5 py-3">
                            <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                              Subject Details
                            </div>
                            <div className="space-y-1.5">
                              {group.schedules.map((schedule) => (
                                <div
                                  key={schedule.scheduleId}
                                  className="flex items-center justify-between text-sm py-1.5 px-3 rounded-md hover:bg-background/60 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="font-medium text-foreground">
                                      {schedule.subjectName}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(
                                        schedule.examDate
                                      ).toLocaleDateString("en-IN", {
                                        day: "2-digit",
                                        month: "short",
                                      })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-muted-foreground uppercase">
                                        Gen:
                                      </span>
                                      {schedule.allGenerated ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                      ) : (
                                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-muted-foreground uppercase">
                                        Pub:
                                      </span>
                                      {schedule.allPublished ? (
                                        <Send className="w-3.5 h-3.5 text-sky-500" />
                                      ) : (
                                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {group.schedules.some(
                              (s) => s.lastGeneratedAt
                            ) && (
                              <div className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border/30">
                                Last action:{" "}
                                {new Date(
                                  group.schedules
                                    .filter((s) => s.lastGeneratedAt)
                                    .sort(
                                      (a, b) =>
                                        new Date(
                                          b.lastGeneratedAt!
                                        ).getTime() -
                                        new Date(
                                          a.lastGeneratedAt!
                                        ).getTime()
                                    )[0].lastGeneratedAt!
                                ).toLocaleString("en-IN")}
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
