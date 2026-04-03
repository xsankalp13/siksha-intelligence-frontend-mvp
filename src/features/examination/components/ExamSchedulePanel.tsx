import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Clock,
  BookOpen,
  Loader2,
  ClipboardList,
  Calendar,
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
  useGetSchedulesByExam,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
} from "../hooks/useExaminationQueries";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type {
  ExamResponseDTO,
  ExamScheduleRequestDTO,
  ExamScheduleResponseDTO,
} from "@/services/types/examination";

import { toast } from "sonner";

interface ClassDto {
  classId: string;
  name: string;
  sections?: { uuid: string; sectionName: string }[];
}
interface SubjectDto {
  uuid: string;
  name: string;
  subjectCode: string;
}

interface Props {
  exam: ExamResponseDTO;
  onBack: () => void;
  onEnterMarks: (schedule: ExamScheduleResponseDTO) => void;
}

/* ── internal form state (keeps the original Start / End UI) ── */
interface ScheduleFormState {
  classId: string;
  sectionId: string;
  subjectId: string;
  examDate: string;
  startTime: string;
  endTime: string;
  roomNumber: string;
}

const emptyForm: ScheduleFormState = {
  classId: "",
  sectionId: "",
  subjectId: "",
  examDate: "",
  startTime: "",
  endTime: "",
  roomNumber: "",
};

function calcDuration(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : 0;
}

export default function ExamSchedulePanel({
  exam,
  onBack,
  onEnterMarks,
}: Props) {
  const { data: schedules = [], isLoading } = useGetSchedulesByExam(exam.uuid);
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const deleteSchedule = useDeleteSchedule();

  const { data: classes = [] } = useQuery<ClassDto[]>({
    queryKey: ["classes", "all"],
    queryFn: async () => (await api.get("/auth/classes")).data,
    staleTime: 10 * 60 * 1000,
  });

  const { data: subjects = [] } = useQuery<SubjectDto[]>({
    queryKey: ["subjects", "all"],
    queryFn: async () => (await api.get("/auth/subjects")).data,
    staleTime: 10 * 60 * 1000,
  });



  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExamScheduleResponseDTO | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<ExamScheduleResponseDTO | null>(null);
  const [form, setForm] = useState<ScheduleFormState>(emptyForm);

  const selectedClassSections =
    classes.find((c) => c.classId === form.classId)?.sections ?? [];

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, examDate: exam.startDate });
    setDialogOpen(true);
  };

  const openEdit = (s: ExamScheduleResponseDTO) => {
    setEditing(s);
    setForm({
      classId: s.classId,
      sectionId: s.sectionId || "",
      subjectId: s.subjectId,
      examDate: s.examDate,
      startTime: s.startTime ? s.startTime.substring(0, 5) : "",
      endTime: s.endTime ? s.endTime.substring(0, 5) : "",
      roomNumber: s.roomNumber || "",
    });
    setDialogOpen(true);
  };



  const handleSubmit = () => {
    if (
      !form.classId ||
      !form.subjectId ||
      !form.examDate ||
      !form.startTime ||
      !form.endTime
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    const duration = calcDuration(form.startTime, form.endTime);
    if (duration <= 0) {
      toast.error("End time must be after start time");
      return;
    }

    const formatTimeForBackend = (t: string) => (t && t.length === 5 ? `${t}:00` : t);

    const payload: ExamScheduleRequestDTO = {
      classId: form.classId,
      sectionId: form.sectionId || undefined,
      subjectId: form.subjectId,
      examDate: form.examDate,
      startTime: formatTimeForBackend(form.startTime),
      endTime: formatTimeForBackend(form.endTime),
      duration,
      maxMarks: 100,
      passingMarks: 33,
      roomNumber: form.roomNumber || undefined,
    };

    console.log("[DEBUG] Schedule form state:", JSON.stringify(form));
    console.log("[DEBUG] Schedule payload:", JSON.stringify(payload));

    if (editing) {
      updateSchedule.mutate(
        {
          scheduleId: editing.scheduleId,
          examUuid: exam.uuid,
          data: payload,
        },
        {
          onSuccess: () => {
            toast.success("Schedule updated");
            setDialogOpen(false);
          },
          onError: () => toast.error("Failed to update schedule"),
        }
      );
    } else {
      createSchedule.mutate(
        { examUuid: exam.uuid, data: payload },
        {
          onSuccess: () => {
            toast.success("Schedule created");
            setDialogOpen(false);
          },
          onError: () => toast.error("Failed to create schedule"),
        }
      );
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteSchedule.mutate(
      { scheduleId: deleteTarget.scheduleId, examUuid: exam.uuid },
      {
        onSuccess: () => {
          toast.success("Schedule deleted");
          setDeleteTarget(null);
        },
        onError: () => toast.error("Failed to delete"),
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h3 className="font-semibold text-foreground text-lg">
              {exam.name} — Schedules
            </h3>
            <p className="text-sm text-muted-foreground">
              {exam.examType.replace(/_/g, " ")} · {exam.academicYear}
            </p>
          </div>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Schedule
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[250px] rounded-2xl border-2 border-dashed border-border/60 gap-3 text-center">
          <div className="p-4 rounded-full bg-muted">
            <ClipboardList className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">No schedules yet</p>
          <p className="text-sm text-muted-foreground">
            Add subject-wise schedules for this examination
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Subject</TableHead>
                <TableHead>Class / Section</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Room</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {schedules.map((s) => (
                  <motion.tr
                    key={s.scheduleId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary shrink-0" />
                        <span className="font-medium">{s.subjectName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span>{s.className}</span>
                      {s.sectionName && (
                        <Badge
                          variant="outline"
                          className="ml-1.5 text-xs"
                        >
                          {s.sectionName}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(s.examDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <Clock className="w-3.5 h-3.5" />
                        {s.startTime && s.endTime
                          ? `${s.startTime.substring(0, 5)} – ${s.endTime.substring(0, 5)}`
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {s.roomNumber ? (
                        <Badge variant="outline" className="gap-1 border-border/50">
                          <DoorOpen className="w-3 h-3" />
                          {s.roomNumber}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => setDeleteTarget(s)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Schedule" : "Add Schedule"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  Class <span className="text-destructive">*</span>
                </label>
                <Select
                  value={form.classId}
                  onValueChange={(v) =>
                    setForm({ ...form, classId: v, sectionId: "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.classId} value={c.classId}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Section</label>
                <Select
                  value={form.sectionId || ""}
                  onValueChange={(v) => setForm({ ...form, sectionId: v })}
                  disabled={!form.classId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All sections" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedClassSections.map((s) => (
                      <SelectItem key={s.uuid} value={s.uuid}>
                        {s.sectionName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">
                Subject <span className="text-destructive">*</span>
              </label>
              <Select
                value={form.subjectId}
                onValueChange={(v) => setForm({ ...form, subjectId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.uuid} value={s.uuid}>
                      {s.name} ({s.subjectCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={form.examDate}
                  onChange={(e) =>
                    setForm({ ...form, examDate: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  Start <span className="text-destructive">*</span>
                </label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm({ ...form, startTime: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  End <span className="text-destructive">*</span>
                </label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) =>
                    setForm({ ...form, endTime: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Room</label>
              <Input
                value={form.roomNumber || ""}
                onChange={(e) =>
                  setForm({ ...form, roomNumber: e.target.value })
                }
                placeholder="e.g. R-201"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  createSchedule.isPending || updateSchedule.isPending
                }
              >
                {(createSchedule.isPending || updateSchedule.isPending) && (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                )}
                {editing ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Remove this schedule entry? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSchedule.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
