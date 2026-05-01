import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  ChevronDown,
  ChevronUp,
  Download,
  AlertCircle,
  Loader2,
  FileCheck,
  CalendarDays,
  FileText,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  useStudentResults,
  useStudentResultDetail,
  useDownloadResultPdf,
} from "@/features/examination/hooks/useEvaluationQueries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function StudentResultsPage() {
  const [search, setSearch] = useState("");
  const { data: results = [], isLoading, isError, refetch } = useStudentResults();
  
  const filtered = useMemo(() => {
    if (!search.trim()) return results;
    const q = search.toLowerCase();
    return results.filter(
      (r) =>
        r.examName.toLowerCase().includes(q) ||
        r.subjectName.toLowerCase().includes(q)
    );
  }, [results, search]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Loading your results...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="font-medium text-lg">Failed to load results</p>
        <p className="text-muted-foreground text-sm">There was a problem fetching your examination results.</p>
        <Button variant="outline" onClick={() => refetch()} className="mt-2">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Award className="w-6 h-6 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">My Results</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-12">
            View your published examination results and download evaluated answer sheets
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search exams, subjects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] bg-card border border-border/50 rounded-2xl gap-4 text-center p-8 shadow-sm">
          <div className="p-4 bg-muted/50 rounded-full">
            <FileText className="w-12 h-12 text-muted-foreground/40" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">No Results Available</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm">
              {search 
                ? "No results match your search criteria." 
                : "You don't have any published results yet. They will appear here once finalized by the administration."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((result) => (
            <StudentResultCard key={result.resultId} resultId={result.resultId} />
          ))}
        </div>
      )}
    </div>
  );
}

function StudentResultCard({ resultId }: { resultId: number }) {
  const [expanded, setExpanded] = useState(false);
  const { data: detail } = useStudentResultDetail(resultId, expanded);
  const downloadMutation = useDownloadResultPdf();

  if (!detail && !expanded) {
    // Render a skeleton/simple view if not expanded yet (we don't have data until expanded currently, 
    // unless pre-fetched. Actually, we do have the summary data from the parent list, but we only passed resultId.
    // Let's rely on useStudentResultDetail pulling from cache if possible, or show a loader.
  }

  // Load the detail immediately for the card view, since we didn't pass the summary props
  // To avoid waterfall, in a better architecture we'd pass the summary object as a prop.
  // We will assume `useStudentResultDetail` fetches the full object fast enough.
  const { data: fullDetail, isLoading: fullLoading } = useStudentResultDetail(resultId, true);

  if (fullLoading || !fullDetail) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-5 h-48 animate-pulse shadow-sm flex flex-col justify-between">
        <div className="space-y-3">
          <div className="w-1/2 h-5 bg-muted rounded-md" />
          <div className="w-3/4 h-4 bg-muted rounded-md" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-10 bg-muted rounded-xl" />
          <div className="h-10 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const blob = await downloadMutation.mutateAsync(resultId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fullDetail.subjectName}_${fullDetail.examName}_Result.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (err) {
      toast.error("Failed to download PDF");
    }
  };

  const percentage = (fullDetail.totalMarks / fullDetail.maxMarks) * 100;
  
  let gradeColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (percentage < 40) gradeColor = "text-red-600 bg-red-50 border-red-200";
  else if (percentage < 60) gradeColor = "text-amber-600 bg-amber-50 border-amber-200";
  else if (percentage < 80) gradeColor = "text-blue-600 bg-blue-50 border-blue-200";

  return (
    <div 
      className={`rounded-2xl border transition-all duration-300 overflow-hidden bg-card ${
        expanded ? "border-primary/40 shadow-md ring-1 ring-primary/10" : "border-border/60 shadow-sm hover:border-primary/30 hover:shadow-md"
      }`}
    >
      {/* Card Header (Always visible) */}
      <div 
        className="p-5 cursor-pointer flex flex-col gap-4 relative overflow-hidden"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Subtle background decoration based on grade */}
        <div className={`absolute -right-12 -top-12 w-32 h-32 rounded-full opacity-[0.03] ${gradeColor.split(" ")[1]}`} />

        <div className="flex justify-between items-start z-10">
          <div className="space-y-1">
            <h3 className="font-bold text-foreground line-clamp-1">{fullDetail.subjectName}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1">{fullDetail.examName}</p>
          </div>
          <div className={`px-2.5 py-1 rounded-lg border flex flex-col items-center justify-center min-w-[3.5rem] ${gradeColor}`}>
            <span className="text-xs font-semibold opacity-70 -mb-1">SCORE</span>
            <span className="text-lg font-bold tabular-nums">
              {fullDetail.totalMarks.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs z-10">
          <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border/40">
            <CalendarDays className="w-3.5 h-3.5" />
            <span className="font-medium">{format(new Date(fullDetail.examDate), "MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border/40">
            <FileCheck className="w-3.5 h-3.5" />
            <span className="font-medium capitalize">Evaluation</span>
          </div>
        </div>

        <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden mt-1 blur-[0.5px]">
          <motion.div 
            className={`h-full rounded-full ${gradeColor.split(" ")[1].replace('50', '500')}`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>

        <div className="flex items-center justify-between mt-2 z-10">
          <span className="text-xs font-semibold text-muted-foreground/80 tracking-wider uppercase">
            Out of {fullDetail.maxMarks}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium relative top-z z-20"
              onClick={handleDownload}
              disabled={downloadMutation.isPending}
            >
              {downloadMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              PDF
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded Content (Section Breakdown) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/40 bg-muted/10 p-5 space-y-4">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Section Breakdown
              </h4>
              
              <div className="space-y-3">
                {(fullDetail.subjectMarks || []).map((sm, idx) => {
                  const secPercentage = sm.maxMarks > 0 ? (sm.marksObtained / sm.maxMarks) * 100 : 0;
                  return (
                    <div key={sm.subjectName + idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-foreground flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground border">
                            {String.fromCharCode(65 + idx)}
                          </span>
                          {sm.subjectName}
                        </span>
                        <span className="font-bold tabular-nums">
                          {sm.marksObtained.toFixed(1)} <span className="text-muted-foreground/60 text-xs font-normal">/ {sm.maxMarks}</span>
                        </span>
                      </div>
                      
                      <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-primary/60 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${secPercentage}%` }}
                          transition={{ duration: 0.8, delay: 0.1 * idx }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 mt-3 border-t border-border/40 flex justify-between items-center text-xs text-muted-foreground">
                <span>Published on {format(new Date(fullDetail.publishedAt), "MMMM d, yyyy")}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
