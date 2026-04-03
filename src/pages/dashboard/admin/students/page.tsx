import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Plus,
  Loader2,
  GraduationCap,
  Upload,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Printer,
  CreditCard,
  Camera,
} from "lucide-react";
import { toast } from "sonner";

import StatusBadge from "@/components/common/StatusBadge";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import TableSkeleton from "@/components/common/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  adminService,
  type StudentSummaryDTO,
} from "@/services/admin";
import {
  classesService,
  type AcademicClassResponseDto,
  type SectionResponseDto,
} from "@/services/classes";

import BulkDataUpload from "@/features/bulk-upload/BulkDataUpload";
import StudentsWithGuardiansUpload from "@/features/bulk-upload/StudentsWithGuardiansUpload";
import { IdCardBatchDialog } from "@/features/uis/id-card/IdCardBatchDialog";
import { BulkPhotoUploadDialog } from "@/features/uis/id-card/BulkPhotoUploadDialog";
import { idCardService, triggerBlobDownload } from "@/services/idCard";

// ── Zod Schema ──────────────────────────────────────────────────────
const studentSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  // rollNo required for create but optional for edit
  rollNo: z.coerce.number().int().positive("Roll number must be positive").optional(),
  // classId/sectionId required for create (shown in UI), optional for edit (hidden in UI)
  classId: z.string().optional(),
  // sectionId is a UUID string — the sections API only exposes uuid, never a numeric ID
  sectionId: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  enrollmentNumber: z.string().optional(),
  initialPassword: z.string().optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

const PAGE_SIZE = 20;

// ── Page ─────────────────────────────────────────────────────────────
export default function StudentsPage() {
  // ── Table state ───────────────────────────────────────────────────
  const [students, setStudents] = useState<StudentSummaryDTO[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState<string>("");
  const [sectionFilter, setSectionFilter] = useState<string>("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Dialog state ──────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTab, setBulkTab] = useState<"with-guardians" | "guardians-only" | "students-only">("with-guardians");
  const [editingStudent, setEditingStudent] = useState<StudentSummaryDTO | null>(null);
  const [pendingEditData, setPendingEditData] = useState<StudentFormData | null>(null);
  const [actionTarget, setActionTarget] = useState<{ student: StudentSummaryDTO; action: 'activate' | 'block' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [photoUploadOpen, setPhotoUploadOpen] = useState(false);

  // ── Cascading class → section dropdowns ──────────────────────────
  const [classes, setClasses] = useState<AcademicClassResponseDto[]>([]);
  const [sections, setSections] = useState<SectionResponseDto[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const form = useForm<StudentFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(studentSchema) as any,
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      middleName: "",
      lastName: "",
      rollNo: undefined,
      classId: "",
      sectionId: "",
      gender: "",
      dateOfBirth: "",
      enrollmentNumber: "",
      initialPassword: "",
    },
  });

  const fetchStudents = useCallback(
    async (pageNum: number, searchQuery: string, reqClassFilter: string, reqSectionFilter: string) => {
      setLoading(true);
      try {
        // We fetch a large batch to handle filtering, searching, and sorting locally.
        const res = await adminService.listStudents({
          page: 0,
          size: 100, // Backend caps at 100
        });
        
        let data = res.data.content;
        
        // Fetch remaining pages if there's more than 100 students
        if (res.data.totalPages > 1) {
          const promises = [];
          for (let i = 1; i < res.data.totalPages; i++) {
            promises.push(
              adminService.listStudents({ page: i, size: 100 }).then((r) => r.data.content)
            );
          }
          const otherPages = await Promise.all(promises);
          data = data.concat(...otherPages);
        }
        
        // 1. Local Search Filter
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          data = data.filter(s => 
            s.firstName?.toLowerCase().includes(q) ||
            s.lastName?.toLowerCase().includes(q) ||
            s.email?.toLowerCase().includes(q) ||
            s.enrollmentNumber?.toLowerCase().includes(q)
          );
        }

        // 2. Local Class Filter (reqClassFilter is now the exact class name like "Class 1")
        if (reqClassFilter) {
          data = data.filter(s => s.className === reqClassFilter);
        }

        // 3. Local Section Filter
        if (reqSectionFilter) {
          data = data.filter(s => s.sectionName === reqSectionFilter);
        }
        
        // 4. Local Multi-Sort: Classwise then Rollwise
        data = [...data].sort((a, b) => {
          const classA = a.className || "";
          const classB = b.className || "";
          if (classA !== classB) {
            return classA.localeCompare(classB, undefined, { numeric: true });
          }
          const rollA = a.rollNo ?? 999999;
          const rollB = b.rollNo ?? 999999;
          return rollA - rollB;
        });

        // 5. Local Pagination
        const total = data.length;
        const totalPagesCount = Math.ceil(total / PAGE_SIZE) || 1;
        const safePageNum = Math.min(pageNum, totalPagesCount - 1);
        
        const startIdx = safePageNum * PAGE_SIZE;
        const paginatedData = data.slice(startIdx, startIdx + PAGE_SIZE);
        
        setStudents(paginatedData);
        setTotalElements(total);
        setTotalPages(totalPagesCount);
        
        // If the current page was out of bounds due to filtering, aggressively reset to valid page
        if (safePageNum !== pageNum) {
           setPage(safePageNum);
        }

      } catch {
        toast.error("Failed to load students");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchStudents(page, search, classFilter, sectionFilter);
  }, [fetchStudents, page, search, classFilter, sectionFilter]);

  // ── Fetch classes on mount — sections are embedded in each class ──
  useEffect(() => {
    let mounted = true;
    classesService
      .getClasses()
      .then((res) => {
        if (!mounted) return;
        // Sort classes alphabetically by name (numeric sort for "Class 2" before "Class 10")
        const sorted = [...res.data].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        setClasses(sorted);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // ── When class changes, get sections from the already-loaded classes array ──
  // (sections are embedded in AcademicClassResponseDto — no extra API call needed)
  useEffect(() => {
    if (!selectedClassId) { setSections([]); return; }
    const cls = classes.find((c) => c.classId === selectedClassId);
    if (cls) {
      // Sort sections alphabetically by name
      const sorted = [...cls.sections].sort((a, b) => a.sectionName.localeCompare(b.sectionName));
      setSections(sorted);
    } else {
      setSections([]);
    }
  }, [selectedClassId, classes]);

  // ── Debounced search ──────────────────────────────────────────────
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(0);
      setSearch(val);
    }, 400);
  };

  // ── Filter by class ──────────────────────────────────────────────
  const handleClassFilterChange = (val: string) => {
    setClassFilter(val === "ALL" ? "" : val);
    setSectionFilter(""); // reset section when class changes
    setPage(0);
  };

  // ── Open create / edit dialog ─────────────────────────────────────
  const openCreate = () => {
    setEditingStudent(null);
    setSelectedClassId("");
    form.reset();
    setFormOpen(true);
  };

  const openEdit = (s: StudentSummaryDTO) => {
    setEditingStudent(s);
    setSelectedClassId("");
    form.reset({
      username: s.username,
      email: s.email,
      firstName: s.firstName,
      middleName: s.middleName || "",
      lastName: s.lastName,
      rollNo: s.rollNo ?? 0,
      classId: "",
      sectionId: "",
      gender: s.gender || "",
      dateOfBirth: s.dateOfBirth || "",
      enrollmentNumber: s.enrollmentNumber,
    });
    setFormOpen(true);
  };

  // ── Submit ────────────────────────────────────────────────────────
  const onSubmit = (data: StudentFormData) => {
    if (editingStudent) {
      setPendingEditData(data); // triggers confirmation dialog
    } else {
      handleCreate(data);
    }
  };

  const handleEdit = async (data: StudentFormData) => {
    if (!editingStudent) return;
    setSubmitting(true);
    try {
      await adminService.updateStudent(editingStudent.uuid, {
        email: data.email || undefined,
        firstName: data.firstName || undefined,
        middleName: data.middleName || undefined,
        lastName: data.lastName || undefined,
        gender: (data.gender as never) || undefined,
        dateOfBirth: data.dateOfBirth || undefined,
        enrollmentNumber: data.enrollmentNumber || undefined,
        rollNo: data.rollNo || undefined,
        sectionId: data.sectionId || undefined,
      });
      toast.success("Student updated successfully");
      await fetchStudents(page, search, classFilter, sectionFilter);
      setFormOpen(false);
      setPendingEditData(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: string }; message?: string };
      const msg = error?.response?.data ?? error?.message ?? "Failed to save student";
      toast.error(typeof msg === "string" ? msg : "Failed to save student");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async (data: StudentFormData) => {
    setSubmitting(true);
    try {
      await adminService.createStudent({
        username: data.username,
        email: data.email,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        rollNo: data.rollNo!, // UI enforces this field in create mode
        sectionId: data.sectionId!, // UI enforces this field in create mode
        gender: data.gender as never,
        dateOfBirth: data.dateOfBirth || undefined,
        enrollmentNumber: data.enrollmentNumber || data.username,
        initialPassword: data.initialPassword || undefined,
      });
      toast.success("Student enrolled successfully");
      await fetchStudents(0, search, classFilter, sectionFilter);
      setPage(0);
      setFormOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: string }; message?: string };
      const msg = error?.response?.data ?? error?.message ?? "Failed to save student";
      toast.error(typeof msg === "string" ? msg : "Failed to save student");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle Activation ────────────────────────────────────────────────────────
  const handleToggleActive = async () => {
    if (!actionTarget) return;
    setSubmitting(true);
    const { student, action } = actionTarget;
    try {
      const isActive = action === "activate";
      await adminService.toggleStudentActivation(student.uuid, isActive);
      toast.success(`${student.firstName} ${student.lastName} has been ${isActive ? "activated" : "blocked"}`);
      setActionTarget(null);
      await fetchStudents(page, search, classFilter, sectionFilter);
    } catch (err: unknown) {
      const error = err as { response?: { data?: string }; message?: string };
      const msg = error?.response?.data ?? error?.message ?? `Failed to ${action} student`;
      toast.error(typeof msg === "string" ? msg : `Failed to ${action} student`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Bulk upload complete ──────────────────────────────────────────
  const handleBulkUploadComplete = async () => {
    // Intentionally omitting setBulkOpen(false) here so the user can read the detailed 
    // row-level success/failure report table rendered by <BulkDataUpload />
    setPage(0);
    setSearch("");
    setSearchInput("");
    setClassFilter("");
    setSectionFilter("");
    await fetchStudents(0, "", "", "");
    toast.success("Bulk import complete — table refreshed");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Student Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalElements > 0
              ? `${totalElements} student${totalElements !== 1 ? "s" : ""} enrolled`
              : "No students yet — enroll one manually or use Bulk Upload"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button variant="outline" onClick={() => setBatchOpen(true)} className="gap-2 border-primary/20 hover:bg-primary/5">
              <Printer className="h-4 w-4" />
              Batch IDs
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              onClick={() => setPhotoUploadOpen(true)}
              className="gap-2 border-primary/20 hover:bg-primary/5"
            >
              <Camera className="h-4 w-4" />
              Upload Photos
            </Button>
          </motion.div>
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Bulk Import
          </Button>
          <Button onClick={openCreate} className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Search + Refresh bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, email, roll no…"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        
        {/* Class Filter */}
        <Select value={classFilter || "ALL"} onValueChange={handleClassFilterChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.classId} value={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Section Filter (Only visible if a class is selected & has sections) */}
        {(() => {
          const filterClassObj = classes.find((c) => c.name === classFilter);
          if (!filterClassObj || filterClassObj.sections.length === 0) return null;
          
          return (
            <Select 
              value={sectionFilter || "ALL"} 
              onValueChange={(v) => { setSectionFilter(v === "ALL" ? "" : v); setPage(0); }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Sections</SelectItem>
                {[...filterClassObj.sections]
                  .sort((a, b) => a.sectionName.localeCompare(b.sectionName, undefined, { numeric: true }))
                  .map((sec) => (
                    <SelectItem key={sec.uuid} value={sec.sectionName}>
                      {sec.sectionName}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        })()}

        <Button
          variant="outline"
          size="icon"
          onClick={() => fetchStudents(page, search, classFilter, sectionFilter)}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : students.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
          <GraduationCap className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium text-foreground">
            {search ? `No students matching "${search}"` : "No students enrolled yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            {search ? "Try a different search term" : "Add students individually or upload a CSV file"}
          </p>
          {!search && (
            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={() => setBulkOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" />Bulk Upload
              </Button>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />Add Student
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Username</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Roll #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => (
                <tr
                  key={s.studentId}
                  className="border-b border-border/50 transition-colors hover:bg-accent/40"
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {page * PAGE_SIZE + idx + 1}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    <Link to={`/dashboard/admin/users/student/${s.uuid}`} className="hover:underline text-primary transition-colors">
                      {s.firstName} {s.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {s.username}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell truncate max-w-[200px]">
                    {s.email}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.className && s.sectionName
                      ? `${s.className} – ${s.sectionName}`
                      : s.className || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {s.rollNo ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge variant={s.enrollmentStatus === "ACTIVE" ? "active" : "inactive"}>
                      {s.enrollmentStatus === "INACTIVE" ? "BLOCKED" : (s.enrollmentStatus ?? "ACTIVE")}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                          title="Download ID Card"
                          onClick={async () => {
                            try {
                              const res = await idCardService.downloadStudentIdCard(s.studentId);
                              triggerBlobDownload(res.data, `student-id-${s.studentId}.pdf`);
                              toast.success("ID Card downloaded");
                            } catch (e) {
                              toast.error("Failed to download ID Card");
                            }
                          }}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                        </Button>
                      </motion.div>
                      <Link to={`/dashboard/admin/users/student/${s.uuid}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                        >
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(s)}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                      >
                        Edit
                      </Button>
                      {s.enrollmentStatus === "INACTIVE" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActionTarget({ student: s, action: 'activate' })}
                          className="h-7 w-[72px] px-2 text-xs text-green-600 hover:text-green-700"
                        >
                          Activate
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActionTarget({ student: s, action: 'block' })}
                          className="h-7 w-[72px] px-2 text-xs text-destructive hover:text-destructive"
                        >
                          Block
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages} · {totalElements} total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="gap-1"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Upload Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Student Import</DialogTitle>
            <DialogDescription>
              Import students, guardians, or both from CSV files.
            </DialogDescription>
          </DialogHeader>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setBulkTab("with-guardians")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                bulkTab === "with-guardians"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Students + Guardians
            </button>
            <button
              type="button"
              onClick={() => setBulkTab("guardians-only")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                bulkTab === "guardians-only"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Guardians Only
            </button>
            <button
              type="button"
              onClick={() => setBulkTab("students-only")}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                bulkTab === "students-only"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Students Only
            </button>
          </div>

          {/* Tab content */}
          {bulkTab === "with-guardians" && (
            <StudentsWithGuardiansUpload mode="students-with-guardians" onUploadComplete={handleBulkUploadComplete} />
          )}
          {bulkTab === "guardians-only" && (
            <StudentsWithGuardiansUpload mode="guardians-only" onUploadComplete={handleBulkUploadComplete} />
          )}
          {bulkTab === "students-only" && (
            <BulkDataUpload
              defaultUserType="students"
              hideTypeSelector
              onUploadComplete={handleBulkUploadComplete}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* ID Card Batch Print Dialog */}
      <IdCardBatchDialog open={batchOpen} onClose={() => setBatchOpen(false)} />
      
      {/* Bulk Photo Upload Dialog */}
      <BulkPhotoUploadDialog 
        open={photoUploadOpen} 
        onClose={() => setPhotoUploadOpen(false)} 
        userType="students"
      />

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStudent ? "Edit Student" : "Enroll New Student"}</DialogTitle>
            <DialogDescription>
              {editingStudent ? "Update student information." : "Fill in the details to enroll a new student."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Username & Email */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="st-user">Username *</Label>
                <Input
                  id="st-user"
                  {...form.register("username")}
                  placeholder="john2024"
                  disabled={!!editingStudent}
                />
                {form.formState.errors.username && (
                  <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="st-email">Email *</Label>
                <Input
                  id="st-email"
                  type="email"
                  {...form.register("email")}
                  placeholder="student@school.edu"
                  disabled={!!editingStudent}
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Names */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="st-fn">First Name *</Label>
                <Input id="st-fn" {...form.register("firstName")} />
                {form.formState.errors.firstName && (
                  <p className="text-xs text-destructive">{form.formState.errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="st-mn">Middle</Label>
                <Input id="st-mn" {...form.register("middleName")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="st-ln">Last Name *</Label>
                <Input id="st-ln" {...form.register("lastName")} />
                {form.formState.errors.lastName && (
                  <p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Class → Section */}
            {!editingStudent && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Class *</Label>
                  <Select
                    value={selectedClassId}
                    onValueChange={(val) => {
                      setSelectedClassId(val);
                      form.setValue("classId", val);
                      form.setValue("sectionId", ""); // reset section when class changes
                    }}
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
                  {form.formState.errors.classId && (
                    <p className="text-xs text-destructive">{form.formState.errors.classId.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Section *</Label>
                  <Select
                    value={form.watch("sectionId") || ""}
                    onValueChange={(val) => form.setValue("sectionId", val)}
                    disabled={!selectedClassId || sections.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedClassId ? "Select section" : "Select class first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((sec) => (
                        <SelectItem key={sec.uuid} value={sec.uuid}>
                          {sec.sectionName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.sectionId && (
                    <p className="text-xs text-destructive">{form.formState.errors.sectionId.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Roll & Gender */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="st-roll">Roll Number *</Label>
                <Input id="st-roll" type="number" {...form.register("rollNo")} />
                {form.formState.errors.rollNo && (
                  <p className="text-xs text-destructive">{form.formState.errors.rollNo.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={form.watch("gender") ?? ""}
                  onValueChange={(val) => form.setValue("gender", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                    <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* DOB */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="st-dob">Date of Birth</Label>
                <Input id="st-dob" type="date" {...form.register("dateOfBirth")} />
              </div>
              {!editingStudent && (
                <div className="space-y-2">
                  <Label htmlFor="st-pass">Initial Password</Label>
                  <Input id="st-pass" type="password" {...form.register("initialPassword")} placeholder="••••••••" />
                </div>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingStudent ? "Save Changes" : "Enroll Student"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Action confirmation (Block / Activate) */}
      <ConfirmDialog
        open={!!actionTarget}
        onOpenChange={(open) => !open && setActionTarget(null)}
        title={actionTarget?.action === 'activate' ? "Activate Student" : "Block Student"}
        description={`Are you sure you want to ${actionTarget?.action} ${actionTarget?.student.firstName}?`}
        confirmLabel={actionTarget?.action === 'activate' ? "Activate" : "Block"}
        onConfirm={handleToggleActive}
        loading={submitting}
        destructive={actionTarget?.action === 'block'}
      />

      <ConfirmDialog
        open={!!pendingEditData}
        onOpenChange={(open) => !open && setPendingEditData(null)}
        title="Confirm Edit"
        description={`Are you sure you want to save these changes for ${editingStudent?.firstName}?`}
        confirmLabel="Save Changes"
        onConfirm={() => { if (pendingEditData) handleEdit(pendingEditData); }}
        loading={submitting}
        destructive={false}
      />
    </motion.div>
  );
}
