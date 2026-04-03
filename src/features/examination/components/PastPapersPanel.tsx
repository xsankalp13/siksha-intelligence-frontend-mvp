import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2,
  Filter,
  Loader2,
  FileUp,
  FileText,
  Calendar,
  Download,
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
  useGetAllPastPapers,
  useUploadPastPaper,
  useDeletePastPaper,
} from "../hooks/useExaminationQueries";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type {
  PastPaperRequestDTO,
  PastPaperResponseDTO,
  PastPaperExamType,
  PastPaperQueryParams,
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

const EXAM_TYPES: PastPaperExamType[] = [
  "MIDTERM",
  "FINAL",
  "UNIT_TEST",
  "OTHER",
];

const examTypeColors: Record<PastPaperExamType, string> = {
  MIDTERM: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  FINAL: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  UNIT_TEST: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  OTHER: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

export default function PastPapersPanel() {
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

  const [filters, setFilters] = useState<PastPaperQueryParams>({});
  const { data: papers = [], isLoading } = useGetAllPastPapers(filters);
  const uploadPaper = useUploadPastPaper();
  const deletePaper = useDeletePastPaper();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<PastPaperResponseDTO | null>(null);

  // Upload form
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [examYear, setExamYear] = useState(new Date().getFullYear());
  const [examType, setExamType] = useState<PastPaperExamType>("MIDTERM");
  const [file, setFile] = useState<File | null>(null);

  const openUpload = () => {
    setTitle("");
    setClassId("");
    setSubjectId("");
    setExamYear(new Date().getFullYear());
    setExamType("MIDTERM");
    setFile(null);
    setDialogOpen(true);
  };

  const handleUpload = () => {
    if (!title || !classId || !subjectId || !file) {
      toast.error("Please fill all required fields and select a file");
      return;
    }
    const metadata: PastPaperRequestDTO = {
      title,
      classId,
      subjectId,
      examYear,
      examType,
    };
    uploadPaper.mutate(
      { metadata, file },
      {
        onSuccess: () => {
          toast.success("Past paper uploaded");
          setDialogOpen(false);
        },
        onError: () => toast.error("Failed to upload"),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePaper.mutate(deleteTarget.uuid, {
      onSuccess: () => {
        toast.success("Past paper deleted");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete"),
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <Select
            value={filters.classId || "ALL"}
            onValueChange={(v) =>
              setFilters({
                ...filters,
                classId: v === "ALL" ? undefined : v,
              })
            }
          >
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.classId} value={c.classId}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <Input
            type="number"
            placeholder="Year"
            className="w-[90px] h-8 text-xs"
            value={filters.year || ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                year: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
        <Button onClick={openUpload} size="sm" className="gap-1.5 h-8">
          <FileUp className="w-4 h-4" />
          Upload Paper
        </Button>
      </div>

      {/* Papers Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : papers.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[250px] rounded-2xl border-2 border-dashed border-border/60 gap-3 text-center">
          <div className="p-4 rounded-full bg-muted">
            <FileText className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">No past papers</p>
          <p className="text-sm text-muted-foreground">
            Upload past examination papers for reference
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {papers.map((paper, i) => (
              <motion.div
                key={paper.uuid}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
                className="group rounded-xl border border-border/60 bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setDeleteTarget(paper)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <h4 className="font-semibold text-foreground text-sm truncate mb-1">
                  {paper.title}
                </h4>
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {paper.className}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {paper.subjectName}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${examTypeColors[paper.examType]}`}
                  >
                    {paper.examType.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {paper.examYear}
                  </span>
                  {paper.fileSizeKb && (
                    <span>{(paper.fileSizeKb / 1024).toFixed(1)} MB</span>
                  )}
                </div>
                {paper.fileUrl && (
                  <a
                    href={paper.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center justify-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </a>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Upload Past Paper</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Mathematics Final 2025"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  Class <span className="text-destructive">*</span>
                </label>
                <Select value={classId} onValueChange={setClassId}>
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
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  Subject <span className="text-destructive">*</span>
                </label>
                <Select value={subjectId} onValueChange={setSubjectId}>
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
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  Year <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  value={examYear}
                  onChange={(e) => setExamYear(Number(e.target.value))}
                  min={2000}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Exam Type</label>
                <Select
                  value={examType}
                  onValueChange={(v) =>
                    setExamType(v as PastPaperExamType)
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
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">
                PDF File <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) =>
                    setFile(e.target.files?.[0] || null)
                  }
                  className="text-sm"
                />
              </div>
              {file && (
                <p className="text-xs text-muted-foreground">
                  {file.name} ({(file.size / 1024).toFixed(0)} KB)
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploadPaper.isPending}
              >
                {uploadPaper.isPending && (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                )}
                Upload
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
            <AlertDialogTitle>Delete Past Paper</AlertDialogTitle>
            <AlertDialogDescription>
              Remove "{deleteTarget?.title}"? The uploaded file will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePaper.isPending ? (
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
