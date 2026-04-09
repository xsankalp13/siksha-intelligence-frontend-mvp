import { useState, useMemo, useCallback } from "react";
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
  Send
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { 
  useGetAllExams, 
  useGenerateAdmitCardsForSchedule, 
  useGetAdmitCardStatus,
  usePublishAdmitCardsForSchedules
} from "../hooks/useExaminationQueries";
import { examinationService } from "@/services/examination";
import type { ScheduleAdmitCardStatusDTO } from "@/services/types/examination";

// ── Helper: group schedule statuses by className ──────────────────
interface ClassGroup {
  className: string;
  sectionName?: string;
  schedules: ScheduleAdmitCardStatusDTO[];
  totalStudents: number;
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

  return Array.from(map.entries()).map(([key, schedules]) => {
    const generatedSubjects = schedules.filter(s => s.allGenerated).length;
    const publishedSubjects = schedules.filter(s => s.allPublished).length;
    // Students count is the same across subjects for one class
    const totalStudents = Math.max(...schedules.map(s => s.totalStudents), 0);
    return {
      className: schedules[0].className,
      sectionName: schedules[0].sectionName,
      schedules,
      totalStudents,
      totalSubjects: schedules.length,
      generatedSubjects,
      allGenerated: generatedSubjects === schedules.length,
      publishedSubjects,
      allPublished: publishedSubjects === schedules.length,
    };
  });
}

// ── Component ─────────────────────────────────────────────────────
export default function AdmitCardPanel() {
  const [selectedExamUuid, setSelectedExamUuid] = useState<string>("");
  const [generatingClass, setGeneratingClass] = useState<string | null>(null);
  const [publishingClass, setPublishingClass] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<{current: number; total: number; subject: string} | null>(null);
  const [expandedClass, setExpandedClass] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: exams, isLoading: isLoadingExams } = useGetAllExams();
  const { data: scheduleStatuses, isLoading: isLoadingStatus, refetch: refetchStatus } = useGetAdmitCardStatus(selectedExamUuid);
  const generateMutation = useGenerateAdmitCardsForSchedule();
  const publishMutation = usePublishAdmitCardsForSchedules();

  const selectedExam = exams?.find(e => e.uuid === selectedExamUuid);

  const classGroups = useMemo(() => {
    if (!scheduleStatuses) return [];
    return groupByClass(scheduleStatuses);
  }, [scheduleStatuses]);

  const classKey = (g: ClassGroup) => g.className + (g.sectionName || "");

  // Generate all schedules for a class sequentially
  const handleGenerateForClass = useCallback(async (group: ClassGroup) => {
    if (!selectedExamUuid) return;
    const key = classKey(group);
    setGeneratingClass(key);
    
    let successCount = 0;
    let lastError: string | null = null;

    for (let i = 0; i < group.schedules.length; i++) {
      const schedule = group.schedules[i];
      setGenerationProgress({ current: i + 1, total: group.schedules.length, subject: schedule.subjectName });
      
      try {
        await generateMutation.mutateAsync({ examUuid: selectedExamUuid, scheduleId: schedule.scheduleId });
        successCount++;
      } catch (error: any) {
        lastError = error?.response?.data?.message || `Failed for ${schedule.subjectName}`;
      }
    }

    setGeneratingClass(null);
    setGenerationProgress(null);

    if (successCount === group.schedules.length) {
      toast.success(`✅ Admit cards generated for ${group.className}${group.sectionName ? ` (${group.sectionName})` : ""} — ${successCount} subjects. Now you can publish them.`);
    } else if (successCount > 0) {
      toast.warning(`${successCount}/${group.schedules.length} subjects generated. Error: ${lastError}`, { duration: 6000 });
    } else {
      toast.error(lastError || "Failed to generate admit cards.", { duration: 6000 });
    }
  }, [selectedExamUuid, generateMutation]);

  // Publish all schedules for a class
  const handlePublishForClass = useCallback(async (group: ClassGroup) => {
    if (!selectedExamUuid) return;
    const key = classKey(group);
    
    // Only publish generated schedules
    const scheduleIdsToPublish = group.schedules
      .filter(s => s.allGenerated)
      .map(s => s.scheduleId);

    if (scheduleIdsToPublish.length === 0) {
      toast.error("No generated admit cards to publish for this class.");
      return;
    }

    setPublishingClass(key);
    try {
      await publishMutation.mutateAsync({ 
        examUuid: selectedExamUuid, 
        scheduleIds: scheduleIdsToPublish 
      });
      toast.success(`🚀 Admit cards published for ${group.className}${group.sectionName ? ` (${group.sectionName})` : ""}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to publish admit cards.");
    } finally {
      setPublishingClass(null);
    }
  }, [selectedExamUuid, publishMutation]);

  const handleDownloadZip = async () => {
    if (!selectedExamUuid) return;
    try {
      setIsDownloading(true);
      const response = await examinationService.downloadAdminAdmitCardsZip(selectedExamUuid);
      const url = window.URL.createObjectURL(new Blob([response.data as any]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `admit-cards-${selectedExam?.name || selectedExamUuid}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Download started.");
    } catch (error: any) {
      toast.error("Failed to download admit cards archive.");
    } finally {
      setIsDownloading(false);
    }
  };

  const totalClassesPublished = classGroups.filter(g => g.allPublished).length;
  const hasAnyGenerated = classGroups.some(g => g.generatedSubjects > 0);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          Admit Card Management
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Generate admit cards per class. You must manually publish them to make them visible to students.
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
              }}
              disabled={isLoadingExams}
            >
              <SelectTrigger>
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

      {/* Step 2: Class-wise generation & publishing */}
      {selectedExam && (
        <Card className="border-primary/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-bl-full -z-10" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Class-wise Management
                </CardTitle>
                <CardDescription className="mt-1">
                  Generate and then Publish admit cards for each class.
                  {classGroups.length > 0 && (
                    <span className="ml-1 font-medium">
                      ({totalClassesPublished}/{classGroups.length} classes published)
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {hasAnyGenerated && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadZip}
                    disabled={isDownloading}
                    className="gap-1.5"
                  >
                    {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    Download ZIP
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchStatus()}
                  disabled={isLoadingStatus}
                  className="gap-1.5 text-muted-foreground"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
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
                  No exam schedules exist for this exam. Please add schedules first in the "Exams & Schedules" tab.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {classGroups.map((group, index) => {
                  const key = classKey(group);
                  const isGenerating = generatingClass === key;
                  const isPublishing = publishingClass === key;
                  const isExpanded = expandedClass === key;
                  const isBusy = generatingClass !== null || publishingClass !== null;
                  const isThisBusy = isGenerating || isPublishing;

                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className={`rounded-xl border transition-all duration-200 ${
                        group.allPublished
                          ? 'border-emerald-500/30 bg-emerald-500/[0.02]'
                          : group.allGenerated
                          ? 'border-sky-500/30 bg-sky-500/[0.01]'
                          : isThisBusy
                          ? 'border-primary/40 bg-primary/[0.02] shadow-sm'
                          : 'border-border/60 hover:border-border'
                      }`}
                    >
                      {/* Class row — always visible */}
                      <div className="flex items-center gap-4 px-5 py-4">
                        {/* Expand toggle */}
                        <button
                          onClick={() => setExpandedClass(isExpanded ? null : key)}
                          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>

                        {/* Class info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground text-[15px]">
                            {group.className}
                            {group.sectionName && (
                              <span className="text-muted-foreground font-normal ml-1.5">— {group.sectionName}</span>
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
                          {isGenerating && generationProgress ? (
                            <div className="flex items-center gap-2 text-xs text-primary">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="font-medium">
                                {generationProgress.subject} ({generationProgress.current}/{generationProgress.total})
                              </span>
                            </div>
                          ) : isPublishing ? (
                            <div className="flex items-center gap-2 text-xs text-sky-500">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="font-medium">Publishing...</span>
                            </div>
                          ) : group.allPublished ? (
                            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Published
                            </Badge>
                          ) : group.allGenerated ? (
                            <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400 gap-1">
                              <FileText className="w-3 h-3" />
                              Generated (Draft)
                            </Badge>
                          ) : group.generatedSubjects > 0 ? (
                            <Badge variant="outline" className="border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400 gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Partial ({group.generatedSubjects}/{group.totalSubjects})
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1">
                              <Clock className="w-3 h-3" />
                              Pending
                            </Badge>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant={group.allGenerated ? "outline" : "default"}
                            onClick={() => handleGenerateForClass(group)}
                            disabled={isBusy}
                            className="gap-1.5 min-w-[110px]"
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Working...
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
                              disabled={isBusy || group.generatedSubjects === 0}
                              className={`gap-1.5 min-w-[100px] bg-sky-500 hover:bg-sky-600 text-white border-0 ${
                                group.generatedSubjects === 0 ? 'opacity-50' : ''
                              }`}
                            >
                              {isPublishing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              Publish
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Expanded: show individual subjects */}
                      {isExpanded && (
                        <div className="border-t border-border/40 bg-muted/20 px-5 py-3">
                          <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                            Subjects Details
                          </div>
                          <div className="space-y-1.5">
                            {group.schedules.map(schedule => (
                              <div
                                key={schedule.scheduleId}
                                className="flex items-center justify-between text-sm py-1.5 px-3 rounded-md hover:bg-background/60 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-medium text-foreground">{schedule.subjectName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(schedule.examDate).toLocaleDateString('en-IN', {
                                      day: '2-digit', month: 'short'
                                    })}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground uppercase">Gen:</span>
                                    {schedule.allGenerated ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground uppercase">Pub:</span>
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
                          {group.schedules.some(s => s.lastGeneratedAt) && (
                            <div className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border/30">
                              Last action: {new Date(
                                group.schedules
                                  .filter(s => s.lastGeneratedAt)
                                  .sort((a, b) => new Date(b.lastGeneratedAt!).getTime() - new Date(a.lastGeneratedAt!).getTime())[0]
                                  .lastGeneratedAt!
                              ).toLocaleString('en-IN')}
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
      )}
    </div>
  );
}
