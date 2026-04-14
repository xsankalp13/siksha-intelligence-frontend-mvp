import { useState, useMemo } from "react";
import {
  FileCheck,
  Search,
  CheckCircle2,
  Lock,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import {
  useAdminResults,
  useClassResultSummary,
  useApproveClass,
  usePublishClass
} from "@/features/examination/hooks/useEvaluationQueries";

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

function ClassSummaryCard({
  examId,
  examName,
  classId,
  className,
}: {
  examId: string;
  examName: string;
  classId: string;
  className: string;
}) {
  const { data: summary, isLoading, isError } = useClassResultSummary(classId, examId);
  const approveMutation = useApproveClass();
  const publishMutation = usePublishClass();
  const [actionItem, setActionItem] = useState<"approve" | "publish" | null>(null);

  const handleAction = async () => {
    if (!actionItem) return;
    try {
      if (actionItem === "approve") {
        await approveMutation.mutateAsync({ classId, examId });
        toast.success(`Class results approved successfully.`);
      } else if (actionItem === "publish") {
        await publishMutation.mutateAsync({ classId, examId });
        toast.success(`Class results published successfully.`);
      }
      setActionItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Action failed";
      toast.error(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-20 bg-card rounded-xl border border-border/50 animate-pulse">
         <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" /> Loading stats...
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="flex justify-center items-center h-20 bg-red-50 text-red-600 rounded-xl border border-red-200">
         <AlertCircle className="w-5 h-5 mr-2" /> Failed to load summary
      </div>
    );
  }

  const isSetupComplete = summary.pendingStudents === 0;

  return (
    <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm hover:shadow transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center justify-between p-5 gap-4">
        {/* Left Side: Identifiers */}
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg border ${summary.status === 'PUBLISHED' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-background border-border/50 text-muted-foreground'}`}>
             {summary.status === 'PUBLISHED' ? <Lock className="w-6 h-6" /> : <FileCheck className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-bold text-foreground text-base sm:text-lg">{className}</h3>
            <p className="text-sm text-muted-foreground">{examName}</p>
          </div>
        </div>

        {/* Center: Strict Statistics */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="flex flex-col items-center bg-muted/20 px-4 py-2 border border-border/50 rounded-md">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">Total</span>
            <span className="font-bold tabular-nums text-foreground">{summary.totalStudents}</span>
          </div>
          <div className="flex flex-col items-center bg-blue-50/50 px-4 py-2 border border-blue-200/50 rounded-md">
            <span className="text-xs text-blue-600/70 font-semibold uppercase tracking-wider mb-0.5">Evaluated</span>
            <span className="font-bold tabular-nums text-blue-700">{summary.evaluatedStudents}</span>
          </div>
          <div className="flex flex-col items-center bg-slate-50/50 px-4 py-2 border border-slate-200/50 rounded-md">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Absent</span>
            <span className="font-bold tabular-nums text-slate-700">{summary.absentStudents}</span>
          </div>
          <div className={`flex flex-col items-center px-4 py-2 border rounded-md ${summary.pendingStudents > 0 ? 'bg-amber-50 border-amber-200' : 'bg-muted/20 border-border/50'}`}>
            <span className={`text-xs font-semibold uppercase tracking-wider mb-0.5 ${summary.pendingStudents > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>Pending</span>
            <span className={`font-bold tabular-nums ${summary.pendingStudents > 0 ? 'text-amber-700' : 'text-foreground'}`}>{summary.pendingStudents}</span>
          </div>
        </div>

        {/* Right Side: Actions and Status */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
           {summary.status === 'PUBLISHED' && (
             <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Fully Published
             </span>
           )}
           {summary.status !== 'PUBLISHED' && (
             <>
               {summary.pendingStudents > 0 && (
                 <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-sm font-medium">
                   <Clock className="w-4 h-4" /> Incomplete
                 </span>
               )}
               {summary.status === 'READY_FOR_APPROVAL' && isSetupComplete && (
                   <Button 
                     size="sm" 
                     className="bg-teal-600 hover:bg-teal-700 text-white"
                     onClick={() => setActionItem("approve")}
                   >
                     Approve Class
                   </Button>
               )}
               {summary.status === 'APPROVED' && (
                   <Button 
                     size="sm" 
                     className="bg-emerald-600 hover:bg-emerald-700 text-white"
                     onClick={() => setActionItem("publish")}
                   >
                     Publish Class
                   </Button>
               )}
             </>
           )}
        </div>
      </div>

      {/* Validation Warning footer if incomplete */}
      {!isSetupComplete && (
         <div className="px-5 py-3 bg-amber-50/50 border-t border-amber-100 flex items-center gap-2 text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4" /> 
            Cannot approve until all {summary.pendingStudents} pending records are either evaluated or explicitly marked Absent.
         </div>
      )}

      {/* Confirmation Dialogs */}
      <AlertDialog open={!!actionItem} onOpenChange={(open) => !open && setActionItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionItem === "approve" && `Approve Class Results?`}
              {actionItem === "publish" && `Publish Class Results?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionItem === "approve" && (
                <>
                  <p>You are about to approve the overall results for <strong>{className} ({examName})</strong>.</p>
                  <p className="mt-2 text-foreground font-medium">This signifies all {summary.evaluatedStudents} evaluations conform to your standard. They will not be visible to students until you explicitly Publish them.</p>
                </>
              )}
              {actionItem === "publish" && (
                <>
                  <p>Final Warning: You are about to publish the results for <strong>{className} ({examName})</strong>.</p>
                  <p className="mt-2 text-destructive font-medium">This makes the evaluations immediately visible on student profiles. This action should be considered final.</p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className={actionItem === "approve" ? "bg-teal-600 hover:bg-teal-700" : "bg-emerald-600 hover:bg-emerald-700"}
            >
              {(approveMutation.isPending || publishMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Confirm {actionItem === "approve" ? "Approval" : "Publishing"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ResultsApprovalPanel() {
  const [search, setSearch] = useState("");
  // We use the base results fetch to find which classes actually have recorded evaluations.
  const { data: results = [], isLoading, isError } = useAdminResults();

  const uniqueClasses = useMemo(() => {
    const map = new Map<string, { examId: string; examName: string; classId: string; className: string }>();
    
    const filtered = results.filter((r) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      // Only filter by Class or Exam name since students are hidden
      return r.examName.toLowerCase().includes(q) || (r.className && r.className.toLowerCase().includes(q));
    });

    filtered.forEach((r) => {
      // Must ignore undefined classId/examId
      if (!r.examId || !r.classId) return;
      const key = `${r.examId}-${r.classId}`;
      if (!map.has(key)) {
        map.set(key, { 
          examId: r.examId, 
          examName: r.examName, 
          classId: r.classId, 
          className: r.className || "Unknown Class" 
        });
      }
    });
    
    // Group them hierarchically for display:
    const examGroups: Record<string, { examId: string, examName: string, classes: Array<{classId: string, className: string}> }> = {};
    for (const item of map.values()) {
        if (!examGroups[item.examId]) examGroups[item.examId] = { examId: item.examId, examName: item.examName, classes: [] };
        examGroups[item.examId].classes.push({ classId: item.classId, className: item.className });
    }
    
    return Object.values(examGroups);
  }, [results, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-card border border-border/50 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            Results Approval Workflow
            <p className="text-xs text-muted-foreground font-normal mt-0.5">Strict Class-Wise Completion Tracking</p>
          </div>
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search classes or exams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-48 bg-card rounded-xl border border-border/50">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="flex flex-col justify-center items-center h-48 gap-2 text-muted-foreground bg-card rounded-xl border border-border/50">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p>Failed to load initial class data</p>
          </div>
        ) : uniqueClasses.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64 gap-3 text-center bg-card rounded-xl border border-border/50">
            <div className="p-4 bg-muted/50 rounded-full">
              <FileCheck className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">No pending evaluations found for any class.</p>
          </div>
        ) : (
          uniqueClasses.map((examGroup) => (
            <div key={examGroup.examId} className="space-y-4 bg-muted/10 p-5 rounded-2xl border border-border/50">
              <div className="flex items-center gap-2">
                <div className="h-5 w-1.5 bg-primary rounded-full"></div>
                <h2 className="text-lg font-bold text-foreground tracking-tight">{examGroup.examName}</h2>
              </div>
              
              <div className="grid grid-cols-1 gap-4 pl-3 border-l-2 border-border/30 ml-0.5">
                {examGroup.classes.map((cls) => (
                  <ClassSummaryCard 
                    key={cls.classId} 
                    examId={examGroup.examId} 
                    examName={examGroup.examName}
                    classId={cls.classId} 
                    className={cls.className} 
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
