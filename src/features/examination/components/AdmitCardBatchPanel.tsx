import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Download,
  Loader2,
  CheckCircle2,
  Users,
  Send,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  useGetAllExams,
  useGetAdmitCardStatus,
  usePublishTimetable,
} from "../hooks/useExaminationQueries";
import { examinationService } from "@/services/examination";

// ── Component ──────────────────────────────────────────────────────
export default function AdmitCardBatchPanel() {
  const [selectedExamUuid, setSelectedExamUuid] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: exams, isLoading: isLoadingExams } = useGetAllExams();
  const selectedExam = exams?.find((e) => e.uuid === selectedExamUuid);

  const { data: scheduleStatuses, isLoading: isLoadingStatus } =
    useGetAdmitCardStatus(selectedExamUuid);

  const publishTimetableMutation = usePublishTimetable();

  // ── Derived stats ───────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!scheduleStatuses || scheduleStatuses.length === 0) {
      return { totalStudents: 0, totalClasses: 0, totalSubjects: 0 };
    }
    const classSet = new Set(
      scheduleStatuses.map(
        (s) => s.className + (s.sectionName ? `-${s.sectionName}` : "")
      )
    );
    const totalStudents = Math.max(
      ...scheduleStatuses.map((s) => s.totalStudents),
      0
    );

    return {
      totalStudents,
      totalClasses: classSet.size,
      totalSubjects: scheduleStatuses.length,
    };
  }, [scheduleStatuses]);

  const isAlreadyPublished = selectedExam?.timetablePublished === true;

  // ── Handlers ────────────────────────────────────────────────────

  // Download batch PDF
  const handleDownload = useCallback(async () => {
    if (!selectedExamUuid) return;
    try {
      setIsDownloading(true);
      const response = await examinationService.downloadBatchAdmitCards({
        examId: selectedExamUuid,
      });
      const url = window.URL.createObjectURL(new Blob([response.data as any]));
      const link = document.createElement("a");
      link.href = url;
      const safeName = (selectedExam?.name || "admit-cards").replace(
        /[^a-zA-Z0-9-_ ]/g,
        ""
      );
      link.setAttribute("download", `admit-cards-${safeName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Download started.");
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to download admit cards.";
      toast.error("Download failed", { description: msg });
    } finally {
      setIsDownloading(false);
    }
  }, [selectedExamUuid, selectedExam]);

  // Publish exam → makes schedules visible on student dashboards
  const handlePublish = useCallback(async () => {
    if (!selectedExamUuid) return;
    try {
      await publishTimetableMutation.mutateAsync(selectedExamUuid);
      toast.success("🎉 Exam timetable published!", {
        description:
          "Students can now view their exam schedule on their dashboard.",
      });
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to publish exam timetable.";
      toast.error("Publish failed", { description: msg });
    }
  }, [selectedExamUuid, publishTimetableMutation]);

  const handleExamChange = useCallback((val: string) => {
    setSelectedExamUuid(val);
  }, []);

  // ── Derived state ───────────────────────────────────────────────
  const isPublishing = publishTimetableMutation.isPending;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Admit Cards — Download &amp; Publish
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Download a batch PDF of all admit cards, or publish the exam timetable
          to students' dashboards.
        </p>
      </div>

      {/* ─── Step 1: Select Exam ────────────────────────────────── */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
              1
            </span>
            Select Examination
          </CardTitle>
          <CardDescription>
            Choose which exam to download or publish.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="max-w-md">
            <Select
              value={selectedExamUuid}
              onValueChange={handleExamChange}
              disabled={isLoadingExams || isDownloading || isPublishing}
            >
              <SelectTrigger id="batch-admit-exam-select">
                <SelectValue placeholder="Select an exam..." />
              </SelectTrigger>
              <SelectContent>
                {exams?.map((exam) => (
                  <SelectItem key={exam.uuid} value={exam.uuid}>
                    {exam.name} ({exam.academicYear})
                    {exam.published && " ✓"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ─── Step 2: Actions ────────────────────────────────────── */}
      <AnimatePresence>
        {selectedExam && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="border-primary/20 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10" />

              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    2
                  </span>
                  Actions
                </CardTitle>
                <CardDescription>
                  {selectedExam.name} — {selectedExam.academicYear}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Stats row */}
                {!isLoadingStatus && stats.totalStudents > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-center">
                      <Users className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                      <div className="text-xl font-bold text-foreground">
                        {stats.totalStudents}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Students
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-center">
                      <BookOpen className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                      <div className="text-xl font-bold text-foreground">
                        {stats.totalClasses}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Classes
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-center">
                      <FileText className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                      <div className="text-xl font-bold text-foreground">
                        {stats.totalSubjects}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Subjects
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-center">
                      {isAlreadyPublished ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                      ) : (
                        <Send className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                      )}
                      <div className="text-xl font-bold text-foreground">
                        {isAlreadyPublished ? "Yes" : "No"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Published
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Download PDF */}
                  <Button
                    id="batch-admit-download-btn"
                    variant="outline"
                    onClick={handleDownload}
                    disabled={isDownloading || isPublishing}
                    className="gap-2 min-w-[170px]"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Downloading…
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download PDF
                      </>
                    )}
                  </Button>

                  {/* Publish Timetable to Students */}
                  <Button
                    id="batch-admit-publish-btn"
                    onClick={handlePublish}
                    disabled={
                      isPublishing || isDownloading || isAlreadyPublished
                    }
                    className={`gap-2 min-w-[210px] transition-all duration-300 ${
                      isAlreadyPublished
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-sky-500 hover:bg-sky-600 text-white"
                    }`}
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Publishing…
                      </>
                    ) : isAlreadyPublished ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Already Published
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Publish Timetable
                      </>
                    )}
                  </Button>
                </div>

                {/* ── Status Messages ─────────────────────────────── */}
                <AnimatePresence mode="wait">
                  {isDownloading && (
                    <motion.div
                      key="downloading"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            Generating &amp; downloading PDF…
                          </p>
                          <p className="text-xs text-blue-500/70 dark:text-blue-400/60 mt-0.5">
                            One page per student. This may take a few seconds.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {isAlreadyPublished && !isPublishing && !isDownloading && (
                    <motion.div
                      key="published"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Alert className="border-emerald-500/30 bg-emerald-500/5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <AlertTitle className="text-emerald-700 dark:text-emerald-400">
                          Timetable Published
                        </AlertTitle>
                        <AlertDescription className="text-xs text-emerald-600/80 dark:text-emerald-400/70">
                          <div className="flex items-center gap-1.5 mt-1">
                            <Sparkles className="w-3.5 h-3.5" />
                            The exam schedule is now visible on each student's
                            dashboard.
                          </div>
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}

                  {!isAlreadyPublished && !isPublishing && !isDownloading && (
                    <motion.div
                      key="hint"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/30">
                        <Users className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <strong>Download:</strong> Generates a single PDF with
                          one admit card per student.
                          <br />
                          <strong>Publish Timetable:</strong> Makes the exam
                          schedule (subjects, dates, times, rooms) visible on
                          each student's dashboard.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
