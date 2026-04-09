import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Lock,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAdminResults,
  useApproveResult,
  useRejectResult,
  usePublishResult,
} from "@/features/examination/hooks/useEvaluationQueries";
import type { EvaluationResultStatus, AdminResultReviewResponseDTO } from "@/services/types/evaluation";
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

type ActionType = "approve" | "reject" | "publish" | null;

interface ResultGroup {
  key: string;
  examName: string;
  subjectName: string;
  total: number;
  submitted: number;
  approved: number;
  published: number;
  rejected: number;
  results: AdminResultReviewResponseDTO[];
  resultIdsForApprove: number[];
  resultIdsForPublish: number[];
  resultIdsForReject: number[];
}

export default function ResultsApprovalPanel() {
  const [filterStatus, setFilterStatus] = useState<EvaluationResultStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [actionItem, setActionItem] = useState<{ ids: number[]; type: ActionType }>({ ids: [], type: null });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const { data: results = [], isLoading, isError, refetch } = useAdminResults(
    filterStatus === "ALL" ? undefined : filterStatus
  );

  const approveMutation = useApproveResult();
  const rejectMutation = useRejectResult();
  const publishMutation = usePublishResult();

  const groupedResults = useMemo(() => {
    const groups: Record<string, ResultGroup> = {};
    
    // Filter by search string first
    const filtered = results.filter((r) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      // Since we group by exam & subject, searching for them is primary. We can also keep studentName search if user expands.
      return r.examName.toLowerCase().includes(q) ||
             r.subjectName.toLowerCase().includes(q) ||
             r.studentName.toLowerCase().includes(q) ||
             r.enrollmentNumber.toLowerCase().includes(q);
    });

    filtered.forEach((r) => {
      const key = `${r.examName}-${r.subjectName}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          examName: r.examName,
          subjectName: r.subjectName,
          total: 0,
          submitted: 0,
          approved: 0,
          published: 0,
          rejected: 0,
          results: [],
          resultIdsForApprove: [],
          resultIdsForPublish: [],
          resultIdsForReject: [],
        };
      }
      
      const g = groups[key];
      g.total++;
      g.results.push(r);

      if (r.status === "SUBMITTED") g.submitted++;
      else if (r.status === "APPROVED") g.approved++;
      else if (r.status === "PUBLISHED") g.published++;
      else if (r.status === "REJECTED") g.rejected++;

      if (r.status === "SUBMITTED") {
        g.resultIdsForApprove.push(r.resultId);
        g.resultIdsForReject.push(r.resultId);
      }
      if (r.status === "APPROVED") {
        g.resultIdsForPublish.push(r.resultId);
        g.resultIdsForReject.push(r.resultId);
      }
    });

    return Object.values(groups);
  }, [results, search]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAction = async () => {
    if (actionItem.ids.length === 0 || !actionItem.type) return;

    try {
      if (actionItem.type === "approve") {
        await Promise.all(actionItem.ids.map(id => approveMutation.mutateAsync(id)));
        toast.success(`Approved ${actionItem.ids.length} result(s) successfully`);
      } else if (actionItem.type === "reject") {
        // Bulk reject might need a reason in a real app, assuming simple reject for now
        await Promise.all(actionItem.ids.map(id => rejectMutation.mutateAsync(id)));
        toast.success(`Rejected ${actionItem.ids.length} result(s)`);
      } else if (actionItem.type === "publish") {
        await Promise.all(actionItem.ids.map(id => publishMutation.mutateAsync(id)));
        toast.success(`Published ${actionItem.ids.length} result(s) successfully`);
      }
      setActionItem({ ids: [], type: null });
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Action failed";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-card border border-border/50 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            Results Approval Workflow
            <p className="text-xs text-muted-foreground font-normal mt-0.5">Grouped by examination and subject</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto overflow-x-auto">
          {/* Status Filter */}
          <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/50 shrink-0">
            {["ALL", "SUBMITTED", "APPROVED", "PUBLISHED"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s as EvaluationResultStatus | "ALL")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  filterStatus === s
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "ALL" ? "All" : s === "SUBMITTED" ? "Needs Review" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search exams, subjects, students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center items-center h-48 bg-card rounded-xl border border-border/50">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="flex flex-col justify-center items-center h-48 gap-2 text-muted-foreground bg-card rounded-xl border border-border/50">
            <AlertCircle className="w-8 h-8 text-destructive" />
            <p>Failed to load results</p>
          </div>
        ) : groupedResults.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-64 gap-3 text-center bg-card rounded-xl border border-border/50">
            <div className="p-4 bg-muted/50 rounded-full">
              <FileCheck className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">No results found in this category.</p>
          </div>
        ) : (
          groupedResults.map((group) => (
            <div key={group.key} className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
              {/* Group Header */}
              <div 
                className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer gap-4"
                onClick={() => toggleGroup(group.key)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-background rounded-lg border border-border/50">
                    <FileCheck className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm sm:text-base">{group.subjectName}</h3>
                    <p className="text-xs text-muted-foreground">{group.examName}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {/* Stats Badges */}
                  <div className="flex gap-2 text-xs">
                    <span className="px-2 py-1 bg-background border border-border/50 rounded-md font-medium text-muted-foreground">
                      Total: {group.total}
                    </span>
                    {group.submitted > 0 && (
                      <span className="px-2 py-1 bg-amber-500/10 text-amber-700 border border-amber-200 rounded-md font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {group.submitted} Pending
                      </span>
                    )}
                    {group.approved > 0 && (
                      <span className="px-2 py-1 bg-teal-500/10 text-teal-700 border border-teal-200 rounded-md font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {group.approved} Approved
                      </span>
                    )}
                    {group.published > 0 && (
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-700 border border-emerald-200 rounded-md font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3" /> {group.published} Published
                      </span>
                    )}
                  </div>

                  {/* Bulk Actions */}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {group.resultIdsForApprove.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs bg-teal-50 text-teal-700 hover:bg-teal-100 hover:text-teal-800 border-teal-200 shrink-0"
                        onClick={() => setActionItem({ ids: group.resultIdsForApprove, type: "approve" })}
                      >
                        Approve Pending ({group.resultIdsForApprove.length})
                      </Button>
                    )}
                    {group.resultIdsForPublish.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shrink-0"
                        onClick={() => setActionItem({ ids: group.resultIdsForPublish, type: "publish" })}
                      >
                        Publish Approved ({group.resultIdsForPublish.length})
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 ml-2 pointer-events-none shrink-0" onClick={() => {}}>
                      {expandedGroups[group.key] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Group Body (Expanded table) */}
              <AnimatePresence>
                {expandedGroups[group.key] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-border/50 bg-background"
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border/50">
                          <tr>
                            <th className="px-5 py-3 font-semibold">Student</th>
                            <th className="px-5 py-3 font-semibold">Marks</th>
                            <th className="px-5 py-3 font-semibold text-center">Status</th>
                            <th className="px-5 py-3 font-semibold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {group.results.map((row) => (
                            <tr key={row.resultId} className="hover:bg-muted/10 transition-colors">
                              <td className="px-5 py-3">
                                <div className="font-medium text-foreground">{row.studentName}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{row.enrollmentNumber}</div>
                              </td>
                              <td className="px-5 py-3">
                                <span className="font-medium tabular-nums">{row.totalMarks}</span>
                              </td>
                              <td className="px-5 py-3 text-center">
                                {row.status === "SUBMITTED" && (
                                  <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md text-xs font-medium">
                                    <Clock className="w-3 h-3" /> Pending
                                  </span>
                                )}
                                {row.status === "APPROVED" && (
                                  <span className="inline-flex items-center gap-1 bg-teal-500/10 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-md text-xs font-medium">
                                    <CheckCircle2 className="w-3 h-3" /> Approved
                                  </span>
                                )}
                                {row.status === "PUBLISHED" && (
                                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-xs font-medium">
                                    <Lock className="w-3 h-3" /> Published
                                  </span>
                                )}
                                {row.status === "REJECTED" && (
                                  <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-700 border border-red-200 px-2 py-0.5 rounded-md text-xs font-medium">
                                    <XCircle className="w-3 h-3" /> Rejected
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {row.status === "SUBMITTED" && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-[10px] text-teal-700 bg-teal-50 hover:bg-teal-100"
                                        onClick={() => setActionItem({ ids: [row.resultId], type: "approve" })}
                                      >
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-[10px] text-red-700 bg-red-50 hover:bg-red-100"
                                        onClick={() => setActionItem({ ids: [row.resultId], type: "reject" })}
                                      >
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                  {row.status === "APPROVED" && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
                                        onClick={() => setActionItem({ ids: [row.resultId], type: "publish" })}
                                      >
                                        Publish
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-[10px] text-red-700 bg-red-50 hover:bg-red-100"
                                        onClick={() => setActionItem({ ids: [row.resultId], type: "reject" })}
                                      >
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                  {(row.status === "PUBLISHED" || row.status === "REJECTED") && (
                                    <span className="text-[10px] text-muted-foreground mr-1">None</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={!!actionItem.type} onOpenChange={(open) => !open && setActionItem({ ids: [], type: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionItem.type === "approve" && `Approve ${actionItem.ids.length} Result(s)?`}
              {actionItem.type === "reject" && `Reject ${actionItem.ids.length} Result(s)?`}
              {actionItem.type === "publish" && `Publish ${actionItem.ids.length} Result(s)?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionItem.type === "approve" && "The result(s) will be marked as approved and ready for publishing. They will still not be visible to the students until published."}
              {actionItem.type === "reject" && "The result(s) will be sent back to the evaluator. They will be able to edit and re-submit them."}
              {actionItem.type === "publish" && "The result(s) will be finalized and made immediately available to the students."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className={
                actionItem.type === "approve" ? "bg-teal-600 hover:bg-teal-700 text-white" :
                actionItem.type === "reject" ? "bg-red-600 hover:bg-red-700 text-white" :
                "bg-emerald-600 hover:bg-emerald-700 text-white"
              }
            >
              {(approveMutation.isPending || rejectMutation.isPending || publishMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Confirm {actionItem.type?.charAt(0).toUpperCase()}{actionItem.type?.slice(1)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
