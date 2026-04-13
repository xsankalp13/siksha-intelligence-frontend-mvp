import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Send,
  Calendar,
  Search,
  Filter,
  ChevronRight,
  FileText,
  Loader2,
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
  useGetAllExams,
  useCreateExam,
  useUpdateExam,
  useDeleteExam,
  usePublishExam,
} from "../hooks/useExaminationQueries";
import type {
  ExamRequestDTO,
  ExamResponseDTO,
  ExamType,
} from "@/services/types/examination";
import { toast } from "sonner";

const EXAM_TYPES: ExamType[] = [
  "MIDTERM",
  "FINAL",
  "UNIT_TEST",
  "FORMATIVE",
  "SUMMATIVE",
];

const examTypeColors: Record<ExamType, string> = {
  MIDTERM: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  FINAL: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  UNIT_TEST: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  FORMATIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  SUMMATIVE: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

interface Props {
  onViewSchedules: (exam: ExamResponseDTO) => void;
}

export default function ExamListPanel({ onViewSchedules }: Props) {
  const { data: exams = [], isLoading } = useGetAllExams();
  const createExam = useCreateExam();
  const updateExam = useUpdateExam();
  const deleteExam = useDeleteExam();
  const publishExam = usePublishExam();


  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamResponseDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExamResponseDTO | null>(
    null
  );

  // Form state
  const [form, setForm] = useState<ExamRequestDTO>({
    name: "",
    academicYear: "",
    examType: "MIDTERM",
    startDate: "",
    endDate: "",
  });

  const filtered = exams
    .filter((e) => {
      const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "ALL" || e.examType === typeFilter;
      return matchesSearch && matchesType;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const openCreate = () => {
    setEditingExam(null);
    setForm({
      name: "",
      academicYear: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
      examType: "MIDTERM",
      startDate: "",
      endDate: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (exam: ExamResponseDTO) => {
    setEditingExam(exam);
    setForm({
      name: exam.name,
      academicYear: exam.academicYear,
      examType: exam.examType,
      startDate: exam.startDate,
      endDate: exam.endDate,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.academicYear || !form.startDate || !form.endDate) {
      toast.error("Please fill all required fields");
      return;
    }
    if (editingExam) {
      updateExam.mutate(
        { uuid: editingExam.uuid, data: form },
        {
          onSuccess: () => {
            toast.success("Exam updated successfully");
            setDialogOpen(false);
          },
          onError: () => toast.error("Failed to update exam"),
        }
      );
    } else {
      createExam.mutate(form, {
        onSuccess: () => {
          toast.success("Exam created successfully");
          setDialogOpen(false);
        },
        onError: () => toast.error("Failed to create exam"),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteExam.mutate(deleteTarget.uuid, {
      onSuccess: () => {
        toast.success("Exam deleted");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete exam"),
    });
  };

  const handlePublish = (exam: ExamResponseDTO) => {
    publishExam.mutate(exam.uuid, {
      onSuccess: () => toast.success(`"${exam.name}" published`),
      onError: () => toast.error("Failed to publish exam"),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search exams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                {EXAM_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />
            New Exam
          </Button>
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[250px] rounded-2xl border-2 border-dashed border-border/60 gap-3 text-center">
          <div className="p-4 rounded-full bg-muted">
            <FileText className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">No exams found</p>
          <p className="text-sm text-muted-foreground">
            Create your first exam to get started
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((exam, i) => (
              <motion.div
                key={exam.uuid}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.03 }}
                className="group relative rounded-xl border border-border/60 bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-foreground truncate">
                        {exam.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className={examTypeColors[exam.examType]}
                      >
                        {exam.examType.replace(/_/g, " ")}
                      </Badge>
                      {exam.published ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">
                          Published
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          Draft
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(exam.startDate)} — {formatDate(exam.endDate)}
                      </span>
                      <span>AY: {exam.academicYear}</span>
                      {exam.templateName && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {exam.templateName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!exam.published && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                        onClick={() => handlePublish(exam)}
                        title="Publish"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openEdit(exam)}
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(exam)}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-primary"
                      onClick={() => onViewSchedules(exam)}
                    >
                      Schedules
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingExam ? "Edit Exam" : "Create New Exam"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">
                Exam Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Mid-Term Examination 2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  Academic Year <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.academicYear}
                  onChange={(e) =>
                    setForm({ ...form, academicYear: e.target.value })
                  }
                  placeholder="2025-2026"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  Exam Type <span className="text-destructive">*</span>
                </label>
                <Select
                  value={form.examType}
                  onValueChange={(v) =>
                    setForm({ ...form, examType: v as ExamType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  Start Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  End Date <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createExam.isPending || updateExam.isPending}
              >
                {(createExam.isPending || updateExam.isPending) && (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                )}
                {editingExam ? "Save Changes" : "Create Exam"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteExam.isPending ? (
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
