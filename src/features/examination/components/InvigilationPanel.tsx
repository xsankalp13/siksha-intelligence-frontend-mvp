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
  DoorOpen,
  Printer,
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
import { useGetInvigilationsByExam, useAssignInvigilator, useRemoveInvigilator } from "../hooks/useInvigilationQueries";
import { useGetAllExams, useGetSchedulesByExam } from "../hooks/useExaminationQueries";
import { useGetAvailableRooms } from "../hooks/useSeatAllocationQueries";
import { useGetRooms } from "@/features/academics/room_management/queries/useRoomQueries";
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
  const [selectedClassUuid, setSelectedClassUuid] = useState<string>("");
  const [selectedScheduleId, setSelectedScheduleId] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");

  // ── Dialog state ────────────────────────────────────────────────
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InvigilationResponseDTO | null>(null);
  const [formStaffId, setFormStaffId] = useState<string>("");
  const [formRoomId, setFormRoomId] = useState<string>("");
  const [formRole, setFormRole] = useState<InvigilationRole>("PRIMARY");

  // ── Queries ─────────────────────────────────────────────────────
  const { data: exams = [] } = useGetAllExams();
  const { data: schedules = [] } = useGetSchedulesByExam(selectedExamUuid);
  const {
    data: invigilations = [],
    isLoading,
  } = useGetInvigilationsByExam(selectedScheduleId);
  const { data: _allRooms = [] } = useGetRooms();
  const { data: roomsAvailability = [] } = useGetAvailableRooms(selectedScheduleId);

  // Derive rooms where students are actually sitting
  const mappedRooms = useMemo(() => {
    return roomsAvailability
      .filter((r) => r.occupiedCapacity > 0)
      .map((r) => ({ uuid: r.roomUuid, name: r.roomName }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [roomsAvailability]);

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
  const selectedSchedule = useMemo(
    () => schedules.find((s) => s.scheduleId === selectedScheduleId),
    [schedules, selectedScheduleId]
  );
  
  const selectedExam: ExamResponseDTO | undefined = exams.find(
    (e) => e.uuid === selectedExamUuid
  );

  // Derive unique classes from schedules
  const availableClasses = useMemo(() => {
    const classMap = new Map<string, { uuid: string; name: string }>();
    schedules.forEach((s) => {
      if (s.classId && !classMap.has(s.classId)) {
        classMap.set(s.classId, { uuid: s.classId, name: s.className });
      }
    });
    return Array.from(classMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [schedules]);

  // Filter schedules by selected class
  const filteredSchedulesByClass = useMemo(() => {
    if (!selectedClassUuid) return [];
    return schedules.filter((s) => s.classId === selectedClassUuid);
  }, [schedules, selectedClassUuid]);

  const filteredInvigilations = useMemo(() => {
    if (!searchTerm) return invigilations;
    const q = searchTerm.toLowerCase();
    return invigilations.filter(
      (i) =>
        i.staffName.toLowerCase().includes(q) ||
        i.role.toLowerCase().includes(q) ||
        i.roomName?.toLowerCase().includes(q)
    );
  }, [invigilations, searchTerm]);

  // ── Handlers ────────────────────────────────────────────────────
  const handleExamChange = (uuid: string) => {
    setSelectedExamUuid(uuid);
    setSelectedClassUuid("");
    setSelectedScheduleId(0);
    setSearchTerm("");
  };

  const handleClassChange = (uuid: string) => {
    setSelectedClassUuid(uuid);
    setSelectedScheduleId(0);
    setSearchTerm("");
  };

  const handleScheduleChange = (id: string) => {
    setSelectedScheduleId(Number(id));
    setSearchTerm("");
  };

  const openAssign = () => {
    setFormStaffId("");
    setFormRoomId("");
    setFormRole("PRIMARY");
    setAssignOpen(true);
  };

  const handleAssign = () => {
    if (!formStaffId || !selectedScheduleId || !formRoomId) {
      toast.error("Please select a staff member and room");
      return;
    }
    assignMutation.mutate(
      {
        examScheduleId: selectedScheduleId,
        staffId: formStaffId,
        roomId: formRoomId,
        role: formRole,
      },
      {
        onSuccess: () => {
          toast.success("Invigilator assigned");
          setAssignOpen(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Failed to assign invigilator"),
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
    <div className="space-y-5" id="printable-invigilation-plan">
      {/* ── Print Header (Only visible during print) ───────────────── */}
      <div className="hidden print:block mb-8 text-center">
        <h2 className="text-2xl font-bold border-b pb-2">Invigilator Shift Report</h2>
        {selectedSchedule && (
          <p className="text-muted-foreground mt-2 font-mono">
            Exam Schedule: {selectedSchedule.subjectName} — {selectedSchedule.className} 
            {selectedSchedule.sectionName ? ` (${selectedSchedule.sectionName})` : ""}
            {selectedSchedule.examDate && (
              <>
                <br/>
                Date: {new Date(selectedSchedule.examDate).toLocaleDateString("en-IN")}
              </>
            )}
            {selectedSchedule.startTime && selectedSchedule.endTime && (
              <>
                <span className="mx-2">•</span>
                Time Block: {selectedSchedule.startTime.substring(0, 5)} – {selectedSchedule.endTime.substring(0, 5)}
              </>
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
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

        {/* Class selector */}
        <div className="grid gap-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Select Class
          </label>
          <Select
            value={selectedClassUuid}
            onValueChange={handleClassChange}
            disabled={!selectedExamUuid || availableClasses.length === 0}
          >
            <SelectTrigger id="invigilation-class-select">
              <SelectValue placeholder={availableClasses.length === 0 ? "No classes" : "Choose class…"} />
            </SelectTrigger>
            <SelectContent>
              {availableClasses.map((c) => (
                <SelectItem key={c.uuid} value={c.uuid}>
                  {c.name}
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
            disabled={!selectedClassUuid || filteredSchedulesByClass.length === 0}
          >
            <SelectTrigger id="invigilation-schedule-select">
              <SelectValue placeholder={filteredSchedulesByClass.length === 0 ? "No schedules" : "Choose schedule…"} />
            </SelectTrigger>
            <SelectContent>
              {filteredSchedulesByClass.map((s) => (
                <SelectItem key={s.scheduleId} value={String(s.scheduleId)}>
                  {s.subjectName}
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
                placeholder="Search resources…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                disabled={!selectedScheduleId}
              />
            </div>
            <Button
              onClick={() => window.print()}
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0 h-9"
              disabled={!selectedScheduleId || invigilations.length === 0}
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
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
            {invigilations.length} Total Room Shifts
          </Badge>
          <Badge
            variant="outline"
            className="gap-1.5 px-3 py-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {primaryCount} Lead Staff
          </Badge>
          <Badge
            variant="outline"
            className="gap-1.5 px-3 py-1 border-amber-500/30 text-amber-600 dark:text-amber-400"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            {secondaryCount} Supporting Staff
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
              : 'Click "Assign" to map staff members to examination rooms'}
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
                <TableHead>Assigned Resource</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right print:hidden">Actions</TableHead>
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
                      {inv.roomName ? (
                        <Badge variant="outline" className="gap-1 bg-background border-border/50 font-medium">
                          <DoorOpen className="w-3.5 h-3.5 text-muted-foreground" />
                          {inv.roomName}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Legacy Unmapped</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {inv.role === "PRIMARY" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Lead
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 mt-0.5">
                          <ShieldAlert className="w-3 h-3" />
                          Supporting
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right print:hidden">
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
          <div className="grid gap-5 py-2">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">
                Staff Member <span className="text-destructive">*</span>
              </label>
              <Select value={formStaffId} onValueChange={setFormStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target staff member" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
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
                Target Physical Room <span className="text-destructive">*</span>
              </label>
              <Select value={formRoomId} onValueChange={setFormRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duty room" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[150px] overflow-y-auto">
                  {mappedRooms.length > 0 ? (
                    mappedRooms.map((r) => (
                      <SelectItem key={r.uuid} value={r.uuid}>
                        <span className="flex items-center gap-2">
                          <DoorOpen className="w-3.5 h-3.5 text-muted-foreground" />
                          {r.name}
                        </span>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-center text-muted-foreground">
                      {selectedScheduleId 
                        ? "No students mapped in any room for this schedule." 
                        : "Please select a schedule first."}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">
                Security Policy Role <span className="text-destructive">*</span>
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
                      Lead Representative
                    </span>
                  </SelectItem>
                  <SelectItem value="SECONDARY">
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                      Supporting Staff Member
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-end gap-2 pt-2 border-t mt-1">
              <Button variant="ghost" onClick={() => setAssignOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={assignMutation.isPending}
              >
                {assignMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                )}
                Lock Assignment
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
            <AlertDialogTitle>Revoke Shift Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Revoke duty for <strong>{deleteTarget?.staffName}</strong> in <strong>{deleteTarget?.roomName || "room"}</strong>? This action cannot be undone.
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
                "Revoke Clearances"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
