import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Loader2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  Users,
  Calendar,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useGetInvigilationsByExam,
  useAssignInvigilator,
  useRemoveInvigilator,
} from "../hooks/useInvigilationQueries";
import { useGetAllExams, useGetSchedulesByExam } from "../hooks/useExaminationQueries";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { InvigilationResponseDTO, InvigilationRole } from "@/services/types/invigilation";
import type { ExamResponseDTO } from "@/services/types/examination";
import { toast } from "sonner";

// ── Lightweight staff DTO for the selector ──────────────────────────
interface StaffSummary {
  uuid: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  employeeId?: string;
}

interface StaffPage {
  content: StaffSummary[];
  totalElements: number;
}

export default function InvigilationPanel() {
  // ── Exam selection state ────────────────────────────────────────
  const [selectedExamUuid, setSelectedExamUuid] = useState<string>("");
  const [selectedScheduleId, setSelectedScheduleId] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");

  // ── Dialog state ────────────────────────────────────────────────
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InvigilationResponseDTO | null>(null);
  const [formStaffId, setFormStaffId] = useState<string>("");
  const [formRole, setFormRole] = useState<InvigilationRole>("PRIMARY");

  // ── Queries ─────────────────────────────────────────────────────
  const { data: exams = [] } = useGetAllExams();
  const { data: schedules = [] } = useGetSchedulesByExam(selectedExamUuid);
  const {
    data: invigilations = [],
    isLoading,
  } = useGetInvigilationsByExam(selectedScheduleId);

  const { data: staffPage } = useQuery<StaffPage>({
    queryKey: ["staff", "teachers", "all"],
    queryFn: async () =>
      (
        await api.get("/auth/admin/users/staff", {
          params: { staffType: "TEACHER", size: 200 },
        })
      ).data,
    staleTime: 10 * 60 * 1000,
  });
  const staffList = staffPage?.content ?? [];

  // ── Mutations ───────────────────────────────────────────────────
  const assignMutation = useAssignInvigilator();
  const removeMutation = useRemoveInvigilator();

  // ── Derived ─────────────────────────────────────────────────────
  const selectedExam: ExamResponseDTO | undefined = exams.find(
    (e) => e.uuid === selectedExamUuid
  );

  const filteredInvigilations = useMemo(() => {
    if (!searchTerm) return invigilations;
    const q = searchTerm.toLowerCase();
    return invigilations.filter(
      (i) =>
        i.staffName.toLowerCase().includes(q) ||
        i.role.toLowerCase().includes(q)
    );
  }, [invigilations, searchTerm]);

  // ── Handlers ────────────────────────────────────────────────────
  const handleExamChange = (uuid: string) => {
    setSelectedExamUuid(uuid);
    setSelectedScheduleId(0);
    setSearchTerm("");
  };

  const handleScheduleChange = (id: string) => {
    setSelectedScheduleId(Number(id));
    setSearchTerm("");
  };

  const openAssign = () => {
    setFormStaffId("");
    setFormRole("PRIMARY");
    setAssignOpen(true);
  };

  const handleAssign = () => {
    if (!formStaffId || !selectedScheduleId) {
      toast.error("Please select a staff member");
      return;
    }
    assignMutation.mutate(
      {
        examScheduleId: selectedScheduleId,
        staffId: formStaffId,
        role: formRole,
      },
      {
        onSuccess: () => {
          toast.success("Invigilator assigned");
          setAssignOpen(false);
        },
        onError: () => toast.error("Failed to assign invigilator"),
      }
    );
  };

  const handleRemove = () => {
    if (!deleteTarget) return;
    removeMutation.mutate(
      { id: deleteTarget.id, examScheduleId: selectedScheduleId },
      {
        onSuccess: () => {
          toast.success("Invigilator removed");
          setDeleteTarget(null);
        },
        onError: () => toast.error("Failed to remove"),
      }
    );
  };

  // Count by role
  const primaryCount = invigilations.filter((i) => i.role === "PRIMARY").length;
  const secondaryCount = invigilations.filter((i) => i.role === "SECONDARY").length;

  return (
    <div className="space-y-5">
      {/* ── Selectors Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Exam selector */}
        <div className="grid gap-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Select Exam
          </label>
          <Select value={selectedExamUuid} onValueChange={handleExamChange}>
            <SelectTrigger id="invigilation-exam-select">
              <SelectValue placeholder="Choose an exam…" />
            </SelectTrigger>
            <SelectContent>
              {exams.filter(e => e.published).map((e) => (
                <SelectItem key={e.uuid} value={e.uuid}>
                  {e.name} ({e.academicYear})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Schedule selector */}
        <div className="grid gap-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Select Schedule
          </label>
          <Select
            value={selectedScheduleId ? String(selectedScheduleId) : ""}
            onValueChange={handleScheduleChange}
            disabled={!selectedExamUuid || schedules.length === 0}
          >
            <SelectTrigger id="invigilation-schedule-select">
              <SelectValue placeholder={schedules.length === 0 ? "No schedules" : "Choose schedule…"} />
            </SelectTrigger>
            <SelectContent>
              {schedules.map((s) => (
                <SelectItem key={s.scheduleId} value={String(s.scheduleId)}>
                  {s.subjectName} — {s.className}
                  {s.sectionName ? ` (${s.sectionName})` : ""} ·{" "}
                  {new Date(s.examDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search + assign */}
        <div className="grid gap-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Actions
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invigilators…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                disabled={!selectedScheduleId}
              />
            </div>
            <Button
              onClick={openAssign}
              size="sm"
              className="gap-1.5 shrink-0 h-9"
              disabled={!selectedScheduleId}
            >
              <Plus className="w-4 h-4" />
              Assign
            </Button>
          </div>
        </div>
      </div>

      {/* ── Summary badges ──────────────────────────────────────── */}
      {selectedScheduleId > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <Users className="w-3.5 h-3.5" />
            {invigilations.length} Total
          </Badge>
          <Badge
            variant="outline"
            className="gap-1.5 px-3 py-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {primaryCount} Primary
          </Badge>
          <Badge
            variant="outline"
            className="gap-1.5 px-3 py-1 border-amber-500/30 text-amber-600 dark:text-amber-400"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            {secondaryCount} Secondary
          </Badge>
          {selectedExam && (
            <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {selectedExam.name}
            </span>
          )}
        </motion.div>
      )}

      {/* ── Content ─────────────────────────────────────────────── */}
      {!selectedScheduleId ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] rounded-2xl border-2 border-dashed border-border/60 gap-3 text-center">
          <div className="p-4 rounded-full bg-muted">
            <Shield className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">
            Select an exam & schedule
          </p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Choose an exam and then a schedule entry above to view and manage
            invigilator assignments
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center min-h-[250px]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredInvigilations.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[250px] rounded-2xl border-2 border-dashed border-border/60 gap-3 text-center">
          <div className="p-4 rounded-full bg-muted">
            <Shield className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">
            {searchTerm ? "No matching invigilators" : "No invigilators assigned"}
          </p>
          <p className="text-sm text-muted-foreground">
            {searchTerm
              ? "Try a different search term"
              : 'Click "Assign" to assign staff members as invigilators'}
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/60 overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-12">#</TableHead>
                <TableHead>Staff Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filteredInvigilations.map((inv, idx) => (
                  <motion.tr
                    key={inv.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group"
                  >
                    <TableCell className="text-muted-foreground text-sm font-mono">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                          {inv.staffName
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <span className="font-medium">{inv.staffName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {inv.role === "PRIMARY" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Primary
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1">
                          <ShieldAlert className="w-3 h-3" />
                          Secondary
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setDeleteTarget(inv)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </motion.div>
      )}

      {/* ── Assign Dialog ───────────────────────────────────────── */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Assign Invigilator
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">
                Staff Member <span className="text-destructive">*</span>
              </label>
              <Select value={formStaffId} onValueChange={setFormStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[250px] overflow-y-auto">
                  {staffList.map((s) => (
                    <SelectItem key={s.uuid} value={s.uuid}>
                      <span className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                        {s.firstName} {s.lastName}
                        {s.jobTitle && (
                          <span className="text-muted-foreground text-xs">
                            · {s.jobTitle}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">
                Role <span className="text-destructive">*</span>
              </label>
              <Select
                value={formRole}
                onValueChange={(v) => setFormRole(v as InvigilationRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIMARY">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Primary Invigilator
                    </span>
                  </SelectItem>
                  <SelectItem value="SECONDARY">
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                      Secondary Invigilator
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAssignOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={assignMutation.isPending}
              >
                {assignMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                )}
                Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ─────────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Invigilator</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{deleteTarget?.staffName}</strong> from this
              schedule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
