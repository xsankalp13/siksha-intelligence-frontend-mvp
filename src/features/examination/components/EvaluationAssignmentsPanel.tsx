import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck,
  Plus,
  Loader2,
  AlertCircle,
  Search,
  CheckCircle2,
  Clock,
  Upload,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  useAdminEvaluationAssignments,
  useAssignTeacher,
} from "../hooks/useEvaluationQueries";
import { useGetAllExams, useGetSchedulesByExam } from "../hooks/useExaminationQueries";
import { useStaffList } from "@/features/hrms/hooks/useStaffList";
import type {
  EvaluationAssignmentStatus,
  EvaluationAssignmentRole,
} from "@/services/types/evaluation";

// ── Status badge config ──────────────────────────────────────────────

const statusConfig: Record<
  EvaluationAssignmentStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }
> = {
  ASSIGNED: { label: "Assigned", variant: "secondary", icon: Clock },
  IN_PROGRESS: { label: "In Progress", variant: "default", icon: Play },
  COMPLETED: { label: "Completed", variant: "outline", icon: CheckCircle2 },
};

// ── Role badge config ────────────────────────────────────────────────

const roleConfig: Record<
  EvaluationAssignmentRole,
  { label: string; color: string; icon: React.ElementType }
> = {
  UPLOADER: {
    label: "Uploader",
    color: "bg-sky-500/10 text-sky-700 border-sky-200",
    icon: Upload,
  },
  EVALUATOR: {
    label: "Evaluator",
    color: "bg-violet-500/10 text-violet-700 border-violet-200",
    icon: FileCheck,
  },
};

export default function EvaluationAssignmentsPanel() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Assign form state
  const [selectedExamUuid, setSelectedExamUuid] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [teacherIdInput, setTeacherIdInput] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedRole, setSelectedRole] = useState<EvaluationAssignmentRole>("EVALUATOR");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const { data: assignments = [], isLoading, isError } = useAdminEvaluationAssignments();
  const { data: exams = [] } = useGetAllExams();
  const { data: schedules = [] } = useGetSchedulesByExam(selectedExamUuid);
  const { data: staffList = [] } = useStaffList();
  const assignMutation = useAssignTeacher();

  const filtered = useMemo(() => {
    if (!search.trim()) return assignments;
    const q = search.toLowerCase();
    return assignments.filter(
      (a) =>
        a.teacherName.toLowerCase().includes(q) ||
        a.examName.toLowerCase().includes(q) ||
        a.subjectName.toLowerCase().includes(q) ||
        a.status.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q)
    );
  }, [assignments, search]);

  const groupedAssignments = useMemo(() => {
    const groups: Record<string, typeof assignments> = {};
    filtered.forEach(a => {
      if (!groups[a.examName]) groups[a.examName] = [];
      groups[a.examName].push(a);
    });
    return Object.entries(groups).map(([examName, items]) => ({
      examName,
      assignments: items,
    }));
  }, [filtered]);

  const handleAssign = async () => {
    if (!selectedScheduleId || !teacherIdInput.trim()) {
      toast.error("Please select a schedule and enter Teacher ID");
      return;
    }
    try {
      await assignMutation.mutateAsync({
        examScheduleId: Number(selectedScheduleId),
        teacherId: teacherIdInput.trim(),
        dueDate: dueDate || undefined,
        role: selectedRole,
      });
      toast.success(`Teacher assigned as ${selectedRole.toLowerCase()} successfully`);
      setDialogOpen(false);
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Assignment failed";
      toast.error(msg);
    }
  };

  const resetForm = () => {
    setSelectedExamUuid("");
    setSelectedScheduleId("");
    setTeacherIdInput("");
    setDueDate("");
    setSelectedRole("EVALUATOR");
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-center">
        <div className="p-4 rounded-full bg-destructive/10">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        <p className="font-semibold text-foreground">Failed to load evaluation assignments</p>
        <p className="text-sm text-muted-foreground">Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10">
            <ClipboardCheck className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Evaluation Assignments</h2>
            <p className="text-sm text-muted-foreground">Assign uploaders and evaluators for answer sheets</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Assign Staff
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by teacher, exam, subject, role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Assignments Table Grouped */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : groupedAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[200px] rounded-xl border-2 border-dashed border-border/50 text-center gap-2 bg-card">
            <ClipboardCheck className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No evaluation assignments found</p>
          </div>
        ) : (
          groupedAssignments.map((group) => (
            <div key={group.examName} className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
              <div
                className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer gap-4 border-b border-border/5"
                onClick={() => toggleGroup(group.examName)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-background rounded-lg border border-border/50">
                    <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground">{group.examName}</h3>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md border border-border/40">
                    {group.assignments.length} assignment{group.assignments.length !== 1 && "s"}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 pointer-events-none shrink-0" onClick={() => { }}>
                    {expandedGroups[group.examName] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <AnimatePresence>
                {expandedGroups[group.examName] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-border/50 bg-background"
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/20 border-b border-border/50">
                            <th className="text-left p-3 font-medium text-muted-foreground">Subject</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Teacher</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                            <th className="text-left p-3 font-medium text-muted-foreground">Due Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.assignments.map((a) => {
                            const cfg = statusConfig[a.status];
                            const Icon = cfg.icon;
                            const rCfg = roleConfig[a.role];
                            const RoleIcon = rCfg.icon;
                            return (
                              <tr
                                key={a.assignmentId}
                                className="border-b border-border/20 last:border-0 hover:bg-muted/10 transition-colors"
                              >
                                <td className="p-3 text-foreground font-medium">{a.subjectName}</td>
                                <td className="p-3 text-muted-foreground">
                                  {new Date(a.examDate).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                      {a.teacherName.charAt(0)}
                                    </div>
                                    {a.teacherName}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${rCfg.color}`}>
                                    <RoleIcon className="w-3 h-3" />
                                    {rCfg.label}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <Badge variant={cfg.variant} className="gap-1 text-xs">
                                    <Icon className="w-3 h-3" />
                                    {cfg.label}
                                  </Badge>
                                </td>
                                <td className="p-3 text-muted-foreground">
                                  {a.dueDate
                                    ? new Date(a.dueDate).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })
                                    : "—"}
                                </td>
                              </tr>
                            );
                          })}
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

      {/* Assign Staff Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Staff for Evaluation</DialogTitle>
            <DialogDescription>
              Select an exam schedule, choose a role (Uploader or Evaluator), and assign a staff member.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Exam</Label>
              <Select value={selectedExamUuid} onValueChange={(v) => { setSelectedExamUuid(v); setSelectedScheduleId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam..." />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((e) => (
                    <SelectItem key={e.uuid} value={e.uuid}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedExamUuid && (
              <div className="space-y-2">
                <Label>Schedule</Label>
                <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select schedule..." />
                  </SelectTrigger>
                  <SelectContent>
                    {schedules.map((s) => (
                      <SelectItem key={s.scheduleId} value={String(s.scheduleId)}>
                        {s.subjectName} - {s.className}{s.sectionName ? `(${s.sectionName})` : ''} ({s.examDate})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Role Selector */}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as EvaluationAssignmentRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EVALUATOR">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-3.5 h-3.5 text-violet-600" />
                      <span>Evaluator</span>
                      <span className="text-xs text-muted-foreground ml-1">— grades answer sheets</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="UPLOADER">
                    <div className="flex items-center gap-2">
                      <Upload className="w-3.5 h-3.5 text-sky-600" />
                      <span>Uploader</span>
                      <span className="text-xs text-muted-foreground ml-1">— scans & uploads only</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {selectedRole === "UPLOADER"
                  ? "Uploader can only upload answer sheet images. They cannot see marks or evaluate."
                  : "Evaluator can grade answer sheets. If no uploader is assigned, they can also upload."}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Teacher</Label>
              <Select value={teacherIdInput} onValueChange={setTeacherIdInput}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher..." />
                </SelectTrigger>
                <SelectContent>
                  {staffList
                    .filter((s) => s.staffType === "TEACHER" || s.staffType === "EXTERNAL_EXAMINER" || s.category === "TEACHING")
                    .map((staff) => (
                      <SelectItem key={staff.uuid} value={staff.uuid}>
                        {staff.firstName} {staff.lastName} ({staff.employeeId || "No ID"})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date (optional)</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={assignMutation.isPending} className="gap-2">
              {assignMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Assign as {selectedRole === "UPLOADER" ? "Uploader" : "Evaluator"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
