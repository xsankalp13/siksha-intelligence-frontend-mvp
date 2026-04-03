import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Loader2,
  Armchair,
  Search,
  Users,
  Calendar,
  Hash,
  DoorOpen,
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
  useGetSeatingByExam,
  useAssignSeat,
  useRemoveSeat,
} from "../hooks/useInvigilationQueries";
import { useGetAllExams, useGetSchedulesByExam } from "../hooks/useExaminationQueries";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { SittingPlanResponseDTO } from "@/services/types/invigilation";
import type { ExamResponseDTO } from "@/services/types/examination";
import { toast } from "sonner";

// ── Lightweight DTOs for selectors ──────────────────────────────────
interface StudentSummary {
  studentId: string;
  firstName: string;
  lastName: string;
  enrollmentNumber?: string;
  userId: number;
}

interface StudentPage {
  content: StudentSummary[];
  totalElements: number;
}

interface RoomDto {
  uuid: string;
  name: string;
  roomType: string;
  totalCapacity: number;
}

export default function SeatingPlanPanel() {
  // ── Selection state ─────────────────────────────────────────────
  const [selectedExamUuid, setSelectedExamUuid] = useState<string>("");
  const [selectedScheduleId, setSelectedScheduleId] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");

  // ── Dialog state ────────────────────────────────────────────────
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SittingPlanResponseDTO | null>(null);
  const [formStudentId, setFormStudentId] = useState<string>("");
  const [formRoomId, setFormRoomId] = useState<string>("");
  const [formSeatNumber, setFormSeatNumber] = useState("");

  // ── Queries ─────────────────────────────────────────────────────
  const { data: exams = [] } = useGetAllExams();
  const { data: schedules = [] } = useGetSchedulesByExam(selectedExamUuid);
  const {
    data: seating = [],
    isLoading,
  } = useGetSeatingByExam(selectedScheduleId);

  const { data: studentPage } = useQuery<StudentPage>({
    queryKey: ["students", "all-for-seating"],
    queryFn: async () =>
      (await api.get("/auth/admin/users/students", { params: { size: 500 } }))
        .data,
    staleTime: 10 * 60 * 1000,
  });
  const studentList = studentPage?.content ?? [];

  const { data: rooms = [] } = useQuery<RoomDto[]>({
    queryKey: ["rooms", "all"],
    queryFn: async () => (await api.get("/auth/rooms")).data,
    staleTime: 10 * 60 * 1000,
  });

  // ── Mutations ───────────────────────────────────────────────────
  const assignMutation = useAssignSeat();
  const removeMutation = useRemoveSeat();

  // ── Derived ─────────────────────────────────────────────────────
  const selectedExam: ExamResponseDTO | undefined = exams.find(
    (e) => e.uuid === selectedExamUuid
  );

  const filteredSeating = useMemo(() => {
    if (!searchTerm) return seating;
    const q = searchTerm.toLowerCase();
    return seating.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.roomName.toLowerCase().includes(q) ||
        s.seatNumber.toLowerCase().includes(q)
    );
  }, [seating, searchTerm]);

  // Group by room for summary
  const roomGroups = useMemo(() => {
    const map = new Map<string, number>();
    seating.forEach((s) => {
      map.set(s.roomName, (map.get(s.roomName) ?? 0) + 1);
    });
    return Array.from(map.entries());
  }, [seating]);

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
    setFormStudentId("");
    setFormRoomId("");
    setFormSeatNumber("");
    setAssignOpen(true);
  };

  const handleAssign = () => {
    if (!formStudentId || !formRoomId || !formSeatNumber.trim()) {
      toast.error("Please fill all required fields");
      return;
    }
    assignMutation.mutate(
      {
        examScheduleId: selectedScheduleId,
        studentId: Number(formStudentId),
        roomId: formRoomId,
        seatNumber: formSeatNumber.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Seat assigned");
          setAssignOpen(false);
        },
        onError: () => toast.error("Failed to assign seat"),
      }
    );
  };

  const handleRemove = () => {
    if (!deleteTarget) return;
    removeMutation.mutate(
      { id: deleteTarget.id, examScheduleId: selectedScheduleId },
      {
        onSuccess: () => {
          toast.success("Seat assignment removed");
          setDeleteTarget(null);
        },
        onError: () => toast.error("Failed to remove"),
      }
    );
  };

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
            <SelectTrigger id="seating-exam-select">
              <SelectValue placeholder="Choose an exam…" />
            </SelectTrigger>
            <SelectContent>
              {exams.map((e) => (
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
            <SelectTrigger id="seating-schedule-select">
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
                placeholder="Search by student / room…"
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
              Assign Seat
            </Button>
          </div>
        </div>
      </div>

      {/* ── Summary badges ──────────────────────────────────────── */}
      {selectedScheduleId > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3"
        >
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <Users className="w-3.5 h-3.5" />
            {seating.length} Students Seated
          </Badge>
          {roomGroups.map(([room, count]) => (
            <Badge
              key={room}
              variant="outline"
              className="gap-1.5 px-3 py-1 border-blue-500/30 text-blue-600 dark:text-blue-400"
            >
              <DoorOpen className="w-3.5 h-3.5" />
              {room}: {count}
            </Badge>
          ))}
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
            <Armchair className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">
            Select an exam & schedule
          </p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Choose an exam and then a schedule entry above to view and manage the
            seating arrangement
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center min-h-[250px]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredSeating.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[250px] rounded-2xl border-2 border-dashed border-border/60 gap-3 text-center">
          <div className="p-4 rounded-full bg-muted">
            <Armchair className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">
            {searchTerm ? "No matching seats" : "No seating plan yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            {searchTerm
              ? "Try a different search term"
              : 'Click "Assign Seat" to start building the seating arrangement'}
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
                <TableHead>Student</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Seat No.</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filteredSeating.map((seat, idx) => (
                  <motion.tr
                    key={seat.id}
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
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-semibold">
                          {seat.studentName
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <span className="font-medium">{seat.studentName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="gap-1 border-border/50"
                      >
                        <DoorOpen className="w-3 h-3" />
                        {seat.roomName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 font-mono text-sm">
                        <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                        {seat.seatNumber}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setDeleteTarget(seat)}
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
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Armchair className="w-5 h-5 text-primary" />
              Assign Seat
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">
                Student <span className="text-destructive">*</span>
              </label>
              <Select value={formStudentId} onValueChange={setFormStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {studentList.map((s) => (
                    <SelectItem key={s.userId} value={String(s.userId)}>
                      {s.firstName} {s.lastName}
                      {s.enrollmentNumber && (
                        <span className="text-muted-foreground text-xs ml-1">
                          · {s.enrollmentNumber}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  Room <span className="text-destructive">*</span>
                </label>
                <Select value={formRoomId} onValueChange={setFormRoomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => (
                      <SelectItem key={r.uuid} value={r.uuid}>
                        <span className="flex items-center gap-2">
                          <DoorOpen className="w-3.5 h-3.5 text-muted-foreground" />
                          {r.name}
                          <span className="text-xs text-muted-foreground">
                            ({r.totalCapacity} seats)
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  Seat Number <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formSeatNumber}
                  onChange={(e) => setFormSeatNumber(e.target.value)}
                  placeholder="e.g. A-12"
                />
              </div>
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
                Assign Seat
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
            <AlertDialogTitle>Remove Seat Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{deleteTarget?.studentName}</strong> from seat{" "}
              <strong>{deleteTarget?.seatNumber}</strong> in{" "}
              <strong>{deleteTarget?.roomName}</strong>? This cannot be undone.
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
