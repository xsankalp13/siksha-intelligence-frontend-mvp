import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  useGetAllQuestions,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
} from "../hooks/useExaminationQueries";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type {
  QuestionBankRequestDTO,
  QuestionBankResponseDTO,
  QuestionType,
  DifficultyLevel,
  QuestionBankQueryParams,
} from "@/services/types/examination";
import { toast } from "sonner";

interface ClassDto {
  classId: string;
  name: string;
}
interface SubjectDto {
  uuid: string;
  name: string;
  subjectCode: string;
}

const QUESTION_TYPES: QuestionType[] = [
  "MCQ",
  "SHORT_ANSWER",
  "LONG_ANSWER",
  "TRUE_FALSE",
];
const DIFFICULTIES: DifficultyLevel[] = ["EASY", "MEDIUM", "HARD"];

const difficultyColors: Record<DifficultyLevel, string> = {
  EASY: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  HARD: "bg-red-500/10 text-red-600 border-red-500/20",
};

const qtypeColors: Record<QuestionType, string> = {
  MCQ: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  SHORT_ANSWER: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  LONG_ANSWER: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  TRUE_FALSE: "bg-teal-500/10 text-teal-600 border-teal-500/20",
};

const emptyForm: QuestionBankRequestDTO = {
  subjectId: "",
  classId: "",
  topic: "",
  questionType: "MCQ",
  difficultyLevel: "MEDIUM",
  questionText: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctAnswer: "",
  marks: 1,
};

export default function QuestionBankPanel() {
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

  const [filters, setFilters] = useState<QuestionBankQueryParams>({});
  const [search, setSearch] = useState("");
  const { data: questions = [], isLoading } = useGetAllQuestions(filters);
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionBankResponseDTO | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<QuestionBankResponseDTO | null>(null);
  const [form, setForm] = useState<QuestionBankRequestDTO>(emptyForm);

  const filtered = questions.filter(
    (q) =>
      !search ||
      q.questionText.toLowerCase().includes(search.toLowerCase()) ||
      q.topic?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (q: QuestionBankResponseDTO) => {
    setEditing(q);
    setForm({
      subjectId: q.subjectId,
      classId: q.classId,
      topic: q.topic || "",
      questionType: q.questionType,
      difficultyLevel: q.difficultyLevel,
      questionText: q.questionText,
      optionA: q.optionA || "",
      optionB: q.optionB || "",
      optionC: q.optionC || "",
      optionD: q.optionD || "",
      correctAnswer: q.correctAnswer || "",
      marks: q.marks,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (
      !form.subjectId ||
      !form.classId ||
      !form.questionText ||
      !form.marks
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    if (editing) {
      updateQuestion.mutate(
        { uuid: editing.uuid, data: form },
        {
          onSuccess: () => {
            toast.success("Question updated");
            setDialogOpen(false);
          },
          onError: () => toast.error("Failed to update"),
        }
      );
    } else {
      createQuestion.mutate(form, {
        onSuccess: () => {
          toast.success("Question created");
          setDialogOpen(false);
        },
        onError: () => toast.error("Failed to create"),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteQuestion.mutate(deleteTarget.uuid, {
      onSuccess: () => {
        toast.success("Question deleted");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete"),
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search questions or topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <Select
            value={filters.subjectId || "ALL"}
            onValueChange={(v) =>
              setFilters({
                ...filters,
                subjectId: v === "ALL" ? undefined : v,
              })
            }
          >
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.uuid} value={s.uuid}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.type || "ALL"}
            onValueChange={(v) =>
              setFilters({
                ...filters,
                type: v === "ALL" ? undefined : (v as QuestionType),
              })
            }
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              {QUESTION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.difficulty || "ALL"}
            onValueChange={(v) =>
              setFilters({
                ...filters,
                difficulty:
                  v === "ALL" ? undefined : (v as DifficultyLevel),
              })
            }
          >
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {DIFFICULTIES.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} size="sm" className="gap-1.5 h-8">
            <Plus className="w-4 h-4" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[250px] rounded-2xl border-2 border-dashed border-border/60 gap-3 text-center">
          <div className="p-4 rounded-full bg-muted">
            <HelpCircle className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">No questions found</p>
          <p className="text-sm text-muted-foreground">
            Add questions to the bank for paper generation
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead className="text-center">Marks</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filtered.map((q, idx) => (
                  <motion.tr
                    key={q.uuid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group"
                  >
                    <TableCell className="text-xs text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <p className="truncate font-medium text-sm">
                        {q.questionText}
                      </p>
                      {q.topic && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Topic: {q.topic}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {q.subjectName}
                    </TableCell>
                    <TableCell className="text-sm">{q.className}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={qtypeColors[q.questionType]}
                      >
                        {q.questionType.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={difficultyColors[q.difficultyLevel]}
                      >
                        {q.difficultyLevel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {q.marks}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => openEdit(q)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => setDeleteTarget(q)}
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

      {/* Create / Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[580px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Question" : "Add Question"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  Subject <span className="text-destructive">*</span>
                </label>
                <Select
                  value={form.subjectId}
                  onValueChange={(v) => setForm({ ...form, subjectId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.uuid} value={s.uuid}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  Class <span className="text-destructive">*</span>
                </label>
                <Select
                  value={form.classId}
                  onValueChange={(v) => setForm({ ...form, classId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
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
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  Type <span className="text-destructive">*</span>
                </label>
                <Select
                  value={form.questionType}
                  onValueChange={(v) =>
                    setForm({ ...form, questionType: v as QuestionType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  Difficulty <span className="text-destructive">*</span>
                </label>
                <Select
                  value={form.difficultyLevel}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      difficultyLevel: v as DifficultyLevel,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  Marks <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={form.marks}
                  onChange={(e) =>
                    setForm({ ...form, marks: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Topic</label>
              <Input
                value={form.topic || ""}
                onChange={(e) =>
                  setForm({ ...form, topic: e.target.value })
                }
                placeholder="e.g. Photosynthesis"
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">
                Question Text <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={form.questionText}
                onChange={(e) =>
                  setForm({ ...form, questionText: e.target.value })
                }
                rows={3}
                placeholder="Enter the question..."
              />
            </div>

            {form.questionType === "MCQ" && (
              <div className="grid gap-3">
                <label className="text-sm font-medium">
                  Options (MCQ)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={form.optionA || ""}
                    onChange={(e) =>
                      setForm({ ...form, optionA: e.target.value })
                    }
                    placeholder="Option A"
                  />
                  <Input
                    value={form.optionB || ""}
                    onChange={(e) =>
                      setForm({ ...form, optionB: e.target.value })
                    }
                    placeholder="Option B"
                  />
                  <Input
                    value={form.optionC || ""}
                    onChange={(e) =>
                      setForm({ ...form, optionC: e.target.value })
                    }
                    placeholder="Option C"
                  />
                  <Input
                    value={form.optionD || ""}
                    onChange={(e) =>
                      setForm({ ...form, optionD: e.target.value })
                    }
                    placeholder="Option D"
                  />
                </div>
              </div>
            )}

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Correct Answer</label>
              <Input
                value={form.correctAnswer || ""}
                onChange={(e) =>
                  setForm({ ...form, correctAnswer: e.target.value })
                }
                placeholder={
                  form.questionType === "MCQ"
                    ? "e.g. A"
                    : "Expected answer"
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  createQuestion.isPending || updateQuestion.isPending
                }
              >
                {(createQuestion.isPending || updateQuestion.isPending) && (
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
            <AlertDialogTitle>Delete Question</AlertDialogTitle>
            <AlertDialogDescription>
              Remove this question from the bank? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteQuestion.isPending ? (
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
