import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, Upload, ChevronRight, RefreshCw, Search, ChevronLeft, CreditCard, Camera, Plus, Loader2, Sparkles, Pencil, CheckCircle2, XCircle } from "lucide-react";
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
  type StaffSummaryDTO,
} from "@/services/admin";
import { hrmsService } from "@/services/hrms";

import BulkDataUpload from "@/features/bulk-upload/BulkDataUpload";
import { BulkPhotoUploadDialog } from "@/features/uis/id-card/BulkPhotoUploadDialog";
import { idCardService, triggerBlobDownload } from "@/services/idCard";

// ── Types ───────────────────────────────────────────────────────────
type StaffType = "TEACHER" | "PRINCIPAL" | "LIBRARIAN" | "SECURITY_GUARD" | "FINANCE_ADMIN" | "AUDITOR";

const STAFF_TYPE_OPTIONS: { value: StaffType; label: string }[] = [
  { value: "TEACHER", label: "Teacher" },
  { value: "PRINCIPAL", label: "Principal" },
  { value: "LIBRARIAN", label: "Librarian" },
  { value: "SECURITY_GUARD", label: "Security Guard" },
  { value: "FINANCE_ADMIN", label: "Finance Admin" },
  { value: "AUDITOR", label: "Auditor" },
];

// ── Zod Schema ──────────────────────────────────────────────────────
const staffSchema = z.object({
  // Auto-generated on create; optional at schema level (enforced in submit handler)
  username: z.string().optional(),
  email: z.string().email("Invalid email"),
  firstName: z.string().min(1, "Required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Required"),
  jobTitle: z.string().min(1, "Required"),
  category: z.enum(["TEACHING", "NON_TEACHING_SUPPORT", "NON_TEACHING_ADMIN"]),
  department: z.string().min(1, "Required"),
  // designationCode used on create; optional — designation picker provides value
  designationCode: z.string().optional(),
  hireDate: z.string().min(1, "Required"),
  // designationId only used when editing; passed through to update call
  designationId: z.string().optional(),
  staffType: z.enum(["TEACHER", "PRINCIPAL", "LIBRARIAN", "SECURITY_GUARD", "FINANCE_ADMIN", "AUDITOR"]),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  officeLocation: z.string().optional(),
  initialPassword: z.string().optional(),
  specializations: z.string().optional(),
  certifications: z.string().optional(),
  yearsOfExperience: z.coerce.number().int().min(0).optional(),
  educationLevel: z.string().optional(),
  schoolLevelManaged: z.string().optional(),
  adminCertifications: z.string().optional(),
  hasMlisDegree: z.boolean().optional(),
});

type StaffFormData = z.infer<typeof staffSchema>;

const PAGE_SIZE = 20;

// ── Page ─────────────────────────────────────────────────────────────
export default function StaffPage() {
  // ── Table state ───────────────────────────────────────────────────
  const [staff, setStaff] = useState<StaffSummaryDTO[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [staffTypeFilter, setStaffTypeFilter] = useState<string>("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Dialog state ──────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkUploadPhase, setBulkUploadPhase] = useState<"idle" | "validating" | "ready" | "uploading" | "success" | "error">("idle");
  const [editingStaff, setEditingStaff] = useState<StaffSummaryDTO | null>(null);
  const [pendingEditData, setPendingEditData] = useState<StaffFormData | null>(null);
  const [actionTarget, setActionTarget] = useState<{ staff: StaffSummaryDTO; action: 'activate' | 'block' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStaffType, setSelectedStaffType] = useState<StaffType>("TEACHER");
  const [photoUploadOpen, setPhotoUploadOpen] = useState(false);

  const isFinanceOrAuditor = selectedStaffType === "FINANCE_ADMIN" || selectedStaffType === "AUDITOR";

  // ── Username auto-generation state ────────────────────────────────
  const [generatingUsername, setGeneratingUsername] = useState(false);
  const [usernameOverride, setUsernameOverride] = useState(false);
  const usernameDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [validatingUsername, setValidatingUsername] = useState(false);
  const usernameCheckDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<StaffFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(staffSchema) as any,
    defaultValues: {
      username: "", email: "", firstName: "", middleName: "", lastName: "",
      jobTitle: "", hireDate: "", staffType: "TEACHER", gender: "", designationId: "",
      category: "TEACHING", department: "", designationCode: "",
      dateOfBirth: "", officeLocation: "", initialPassword: "",
    },
  });

  const watchUsername = form.watch("username");

  useEffect(() => {
    if (!usernameOverride || editingStaff || !watchUsername) {
      setUsernameAvailable(null);
      return;
    }
    
    if (usernameCheckDebounce.current) clearTimeout(usernameCheckDebounce.current);
    setUsernameAvailable(null);
    setValidatingUsername(true);
    
    usernameCheckDebounce.current = setTimeout(async () => {
      try {
        const res = await adminService.checkUsername(watchUsername);
        setUsernameAvailable(res.data.available);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setValidatingUsername(false);
      }
    }, 500);
  }, [watchUsername, usernameOverride, editingStaff]);

  // ── Auto-generate username from firstName + lastName ──────────────
  const triggerUsernameGeneration = useCallback(
    (firstName: string, lastName: string) => {
      if (usernameOverride || editingStaff || !firstName || !lastName) return;
      if (usernameDebounce.current) clearTimeout(usernameDebounce.current);
      usernameDebounce.current = setTimeout(async () => {
        try {
          setGeneratingUsername(true);
          const res = await adminService.generateUsername(firstName, lastName);
          form.setValue("username", res.data.username, { shouldValidate: false });
        } catch {
          // silently ignore — user can type manually via Override
        } finally {
          setGeneratingUsername(false);
        }
      }, 500);
    },
    [usernameOverride, editingStaff, form]
  );

  // ── Fetch staff (server-side) ─────────────────────────────────────
  const fetchStaff = useCallback(
    async (pageNum: number, searchQuery: string, typeFilter: string) => {
      setLoading(true);
      try {
        const res = await adminService.listStaff({
          page: pageNum,
          size: PAGE_SIZE,
          search: searchQuery || undefined,
          staffType: typeFilter || undefined,
          sortBy: "firstName",
          sortDir: "asc",
        });
        setStaff(res.data.content);
        setTotalElements(res.data.totalElements ?? 0);
        setTotalPages(res.data.totalPages ?? 0);
      } catch {
        toast.error("Failed to load staff");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchStaff(page, search, staffTypeFilter);
  }, [fetchStaff, page, search, staffTypeFilter]);

  const { data: designations = [] } = useQuery({
    queryKey: ["hrms", "designations"],
    queryFn: () => hrmsService.listDesignations({ active: true }).then(res => res.data),
  });

  // ── Debounced search ──────────────────────────────────────────────
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setPage(0);
      setSearch(val);
    }, 400);
  };

  // ── Filter by staff type ──────────────────────────────────────────
  const handleTypeFilterChange = (val: string) => {
    setStaffTypeFilter(val === "ALL" ? "" : val);
    setPage(0);
  };

  // ── Open create / edit ────────────────────────────────────────────
  const openCreate = () => {
    setEditingStaff(null);
    setSelectedStaffType("TEACHER");
    setUsernameOverride(false);
    form.reset({ staffType: "TEACHER" });
    setFormOpen(true);
  };

  const openEdit = (s: StaffSummaryDTO) => {
    setEditingStaff(s);
    setSelectedStaffType(s.staffType as StaffType);
    form.reset({
      username: s.username,
      email: s.email,
      firstName: s.firstName,
      lastName: s.lastName,
      jobTitle: s.jobTitle,
      hireDate: s.hireDate || "",
      designationCode: "",
      staffType: s.staffType as StaffType,
      gender: s.gender || "",
      dateOfBirth: s.dateOfBirth || "",
      officeLocation: s.officeLocation || "",
      designationId: s.designationId ? String(s.designationId) : "",
    });
    setFormOpen(true);
  };

  // ── Submit ────────────────────────────────────────────────────────
  const onSubmit = (data: StaffFormData) => {
    if (editingStaff) {
      setPendingEditData(data);
    } else {
      handleCreate(data);
    }
  };

  const handleEdit = async (data: StaffFormData) => {
    if (!editingStaff) return;
    setSubmitting(true);
    const selectedDesig = designations.find(d => String(d.designationId) === data.designationId);
    const desigId = selectedDesig?.designationId;
    const cat = selectedDesig?.category;

    try {
      await adminService.updateStaff(editingStaff.uuid, {
        email: data.email || undefined,
        firstName: data.firstName || undefined,
        middleName: data.middleName || undefined,
        lastName: data.lastName || undefined,
        gender: (data.gender as never) || undefined,
        dateOfBirth: data.dateOfBirth || undefined,
        jobTitle: data.jobTitle || undefined,
        hireDate: data.hireDate || undefined,
        officeLocation: data.officeLocation || undefined,
        staffType: data.staffType || undefined,
        designationId: desigId,
        category: cat,
      });
      toast.success("Staff member updated successfully");
      await fetchStaff(page, search, staffTypeFilter);
      setFormOpen(false);
      setPendingEditData(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: string }; message?: string };
      const msg = error?.response?.data ?? error?.message ?? "Failed to save staff";
      toast.error(typeof msg === "string" ? msg : "Failed to save staff");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async (data: StaffFormData) => {
    setSubmitting(true);
    // Resolve the effective username — auto-generated value or manual override
    const effectiveUsername = (data.username || "").trim();
    if (!effectiveUsername) {
      toast.error("Username is required. Please wait for auto-generation or click Override.");
      setSubmitting(false);
      return;
    }

    try {
      if (data.staffType === "TEACHER") {
        await adminService.createTeacher({
          username: effectiveUsername,
          email: data.email,
          initialPassword: data.initialPassword || undefined,
          firstName: data.firstName,
          middleName: data.middleName,
          lastName: data.lastName,
          jobTitle: data.jobTitle,
          hireDate: data.hireDate,
          officeLocation: data.officeLocation,
          gender: data.gender as never,
          dateOfBirth: data.dateOfBirth,
          staffType: data.staffType,
          category: data.category as any,
          department: data.department as any,
          specializations: data.specializations ? [data.specializations] : [],
          certifications: data.certifications ? [data.certifications] : [],
          yearsOfExperience: data.yearsOfExperience,
          educationLevel: data.educationLevel,
          designationCode: data.designationCode ?? "",
        });
      } else if (data.staffType === "PRINCIPAL") {
        await adminService.createPrincipal({
          username: effectiveUsername,
          email: data.email,
          initialPassword: data.initialPassword || undefined,
          firstName: data.firstName,
          middleName: data.middleName,
          lastName: data.lastName,
          jobTitle: data.jobTitle,
          hireDate: data.hireDate,
          officeLocation: data.officeLocation,
          gender: data.gender as never,
          dateOfBirth: data.dateOfBirth,
          staffType: data.staffType,
          category: data.category as any,
          department: data.department as any,
          schoolLevelManaged: data.schoolLevelManaged as never,
          administrativeCertifications: data.adminCertifications ? [data.adminCertifications] : [],
          designationCode: data.designationCode ?? "",
        });
      } else if (data.staffType === "LIBRARIAN") {
        await adminService.createLibrarian({
          username: effectiveUsername,
          email: data.email,
          initialPassword: data.initialPassword || undefined,
          firstName: data.firstName,
          middleName: data.middleName,
          lastName: data.lastName,
          jobTitle: data.jobTitle,
          hireDate: data.hireDate,
          officeLocation: data.officeLocation,
          gender: data.gender as never,
          dateOfBirth: data.dateOfBirth,
          staffType: data.staffType,
          category: data.category as any,
          department: data.department as any,
          hasMlisDegree: data.hasMlisDegree,
          designationCode: data.designationCode ?? "",
        });
      } else if (data.staffType === "SECURITY_GUARD") {
        const selectedDesig = designations.find(d => String(d.designationId) === data.designationId);
        await adminService.createSecurityGuard({
          username: effectiveUsername,
          email: data.email,
          initialPassword: data.initialPassword || undefined,
          firstName: data.firstName,
          middleName: data.middleName,
          lastName: data.lastName,
          jobTitle: data.jobTitle,
          hireDate: data.hireDate,
          officeLocation: data.officeLocation,
          gender: data.gender as never,
          dateOfBirth: data.dateOfBirth,
          staffType: data.staffType,
          designationId: selectedDesig?.designationId,
          category: selectedDesig?.category,
        });
      } else if (data.staffType === "FINANCE_ADMIN") {
        await adminService.createFinanceAdmin({
          username: effectiveUsername,
          email: data.email,
          initialPassword: data.initialPassword || undefined,
          firstName: data.firstName,
          middleName: data.middleName,
          lastName: data.lastName,
          jobTitle: data.jobTitle,
          hireDate: data.hireDate,
          officeLocation: data.officeLocation,
          gender: data.gender as never,
          dateOfBirth: data.dateOfBirth,
          staffType: data.staffType,
          category: data.category as any,
          department: data.department as any,
        });
      } else if (data.staffType === "AUDITOR") {
        await adminService.createAuditor({
          username: effectiveUsername,
          email: data.email,
          initialPassword: data.initialPassword || undefined,
          firstName: data.firstName,
          middleName: data.middleName,
          lastName: data.lastName,
          jobTitle: data.jobTitle,
          hireDate: data.hireDate,
          officeLocation: data.officeLocation,
          gender: data.gender as never,
          dateOfBirth: data.dateOfBirth,
          staffType: data.staffType,
          category: data.category as any,
          department: data.department as any,
        });
      }
      toast.success("Staff member hired successfully");
      await fetchStaff(0, search, staffTypeFilter);
      setPage(0);
      setFormOpen(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: string }; message?: string };
      const msg = error?.response?.data ?? error?.message ?? "Failed to save staff";
      toast.error(typeof msg === "string" ? msg : "Failed to save staff");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle Activation ─────────────────────────────────────────────
  const handleToggleActive = async () => {
    if (!actionTarget) return;
    setSubmitting(true);
    const { staff: s, action } = actionTarget;
    try {
      const isActive = action === "activate";
      await adminService.toggleStaffActivation(s.uuid, isActive);
      toast.success(`${s.firstName} ${s.lastName} has been ${isActive ? "activated" : "blocked"}`);
      setActionTarget(null);
      await fetchStaff(page, search, staffTypeFilter);
    } catch (err: unknown) {
      const error = err as { response?: { data?: string }; message?: string };
      const msg = error?.response?.data ?? error?.message ?? `Failed to ${action} staff member`;
      toast.error(typeof msg === "string" ? msg : `Failed to ${action} staff member`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkUploadComplete = async () => {
    setPage(0);
    setSearch("");
    setSearchInput("");
    await fetchStaff(0, "", staffTypeFilter);
    toast.success("Bulk import complete — table refreshed");
  };

  const isBulkUploading = bulkUploadPhase === "uploading";

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
            <Users className="h-6 w-6 text-primary" />
            Staff Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalElements > 0
              ? `${totalElements} staff member${totalElements !== 1 ? "s" : ""}`
              : "No staff yet — hire one manually or use Bulk Upload"}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            Add Staff
          </Button>
        </div>
      </div>

      {/* Search + Type filter + Refresh */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, email, employee ID…"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <Select value={staffTypeFilter || "ALL"} onValueChange={handleTypeFilterChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {STAFF_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => fetchStaff(page, search, staffTypeFilter)}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={8} columns={6} />
      ) : staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium text-foreground">
            {search ? `No staff matching "${search}"` : "No staff hired yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            {search ? "Try a different search term" : "Add staff individually or upload a CSV file"}
          </p>
          {!search && (
            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={() => setBulkOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" />Bulk Upload
              </Button>
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />Add Staff
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s, idx) => (
                <tr
                  key={s.staffId}
                  className="border-b border-border/50 transition-colors hover:bg-accent/40"
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {page * PAGE_SIZE + idx + 1}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    <Link to={`/dashboard/admin/hrms/staff/${s.uuid}`} className="hover:underline text-primary transition-colors">
                      {s.firstName} {s.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {s.username}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.jobTitle}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary capitalize">
                      {s.staffType.toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge variant={s.active ? "active" : "inactive"}>
                      {s.active ? "Active" : "BLOCKED"}
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
                              const res = await idCardService.downloadStaffIdCard(s.staffId);
                              triggerBlobDownload(res.data, `staff-id-${s.staffId}.pdf`);
                              toast.success("ID Card downloaded");
                            } catch {
                              toast.error("Failed to download ID Card");
                            }
                          }}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                        </Button>
                      </motion.div>
                      <Link to={`/dashboard/admin/hrms/staff/${s.uuid}`}>
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
                      {s.active ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActionTarget({ staff: s, action: 'block' })}
                          className="h-7 w-[72px] px-2 text-xs text-destructive hover:text-destructive"
                        >
                          Block
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActionTarget({ staff: s, action: 'activate' })}
                          className="h-7 w-[72px] px-2 text-xs text-green-600 hover:text-green-700"
                        >
                          Activate
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
      <Dialog
        open={bulkOpen}
        onOpenChange={(open) => {
          if (!open && isBulkUploading) {
            toast.info("Import is in progress. Use Minimize to continue in the background.");
            return;
          }
          setBulkOpen(open);
          if (!open) setBulkUploadPhase("idle");
        }}
      >
        <DialogContent
          className="max-w-4xl max-h-[85vh] overflow-y-auto"
          onInteractOutside={(event) => { if (isBulkUploading) event.preventDefault(); }}
          onPointerDownOutside={(event) => { if (isBulkUploading) event.preventDefault(); }}
          onEscapeKeyDown={(event) => { if (isBulkUploading) event.preventDefault(); }}
        >
          <DialogHeader>
            <DialogTitle>Bulk Staff Upload</DialogTitle>
            <DialogDescription>
              Upload an Excel or CSV file to import multiple staff members at once.
            </DialogDescription>
          </DialogHeader>
          <BulkDataUpload
            defaultUserType="staff"
            hideTypeSelector
            onUploadComplete={handleBulkUploadComplete}
            onPhaseChange={setBulkUploadPhase}
          />
        </DialogContent>
      </Dialog>

      <BulkPhotoUploadDialog
        open={photoUploadOpen}
        onClose={() => setPhotoUploadOpen(false)}
        userType="staff"
      />

      {/* ── Create / Edit Dialog ─────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Staff Member" : "Hire New Staff"}</DialogTitle>
            <DialogDescription>
              {editingStaff ? "Update staff information." : "Fill in the details to hire a new staff member."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Staff Classification (create only) */}
            {!editingStaff && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Staff Type *</Label>
                  <Select
                    value={selectedStaffType}
                    onValueChange={(val) => {
                      const type = val as StaffType;
                      setSelectedStaffType(type);
                      form.setValue("staffType", type);
                      
                      if (type === "FINANCE_ADMIN" || type === "AUDITOR") {
                        form.setValue("category", "NON_TEACHING_ADMIN");
                        form.setValue("department", "FINANCE");
                        form.setValue("jobTitle", type === "FINANCE_ADMIN" ? "Finance Admin" : "Auditor");
                        form.setValue("designationCode", "");
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {STAFF_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className={isFinanceOrAuditor ? "opacity-50" : ""}>Category *</Label>
                  <Select 
                    disabled={isFinanceOrAuditor}
                    value={form.watch("category")} 
                    onValueChange={(val) => form.setValue("category", val as any)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEACHING">Teaching</SelectItem>
                      <SelectItem value="NON_TEACHING_SUPPORT">Non-Teaching Support</SelectItem>
                      <SelectItem value="NON_TEACHING_ADMIN">Non-Teaching Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.category && (
                    <p className="text-xs text-destructive">{form.formState.errors.category.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className={isFinanceOrAuditor ? "opacity-50" : ""}>Department *</Label>
                  <Select 
                    disabled={isFinanceOrAuditor}
                    value={form.watch("department")} 
                    onValueChange={(val) => form.setValue("department", val as any)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACADEMICS">Academics</SelectItem>
                      <SelectItem value="ADMINISTRATION">Administration</SelectItem>
                      <SelectItem value="FINANCE">Finance</SelectItem>
                      <SelectItem value="ADMISSION">Admission</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="FACILITIES">Facilities</SelectItem>
                      <SelectItem value="HUMAN_RESOURCE">Human Resource</SelectItem>
                      <SelectItem value="LIBRARY">Library</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.department && (
                    <p className="text-xs text-destructive">{form.formState.errors.department.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Designation + Job Title (create only) */}
            {!editingStaff && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={isFinanceOrAuditor ? "opacity-50" : ""}>Designation *</Label>
                  <Select 
                    disabled={isFinanceOrAuditor}
                    value={form.watch("designationCode")} 
                    onValueChange={(val) => form.setValue("designationCode", val)}
                  >
                    <SelectTrigger><SelectValue placeholder={isFinanceOrAuditor ? "N/A" : "Select Designation"} /></SelectTrigger>
                    <SelectContent>
                      {designations.map(d => (
                        <SelectItem key={d.uuid} value={d.designationCode}>
                          <div className="flex flex-col">
                            <span>{d.designationName}</span>
                            {(d.defaultSalaryTemplateName || d.defaultGradeCode) && (
                              <span className="text-[10px] text-muted-foreground">
                                Defaults: {d.defaultSalaryTemplateName || "No Salary"} | {d.defaultGradeCode || "No Grade"}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className={isFinanceOrAuditor ? "opacity-50" : ""}>Job Title *</Label>
                  <Input 
                    {...form.register("jobTitle")} 
                    disabled={isFinanceOrAuditor}
                    placeholder="e.g. Senior Math Teacher" 
                  />
                  {form.formState.errors.jobTitle && (
                    <p className="text-xs text-destructive">{form.formState.errors.jobTitle.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Username — auto-generated chip (create only) */}
            {!editingStaff && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Username</Label>
                  <button
                    type="button"
                    onClick={() => setUsernameOverride((v) => !v)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    {usernameOverride ? (
                      <><Sparkles className="h-3 w-3" /> Auto-generate</>
                    ) : (
                      <><Pencil className="h-3 w-3" /> Override</>
                    )}
                  </button>
                </div>
                {usernameOverride ? (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Input {...form.register("username")} placeholder="e.g. john.doe" className="pr-10" />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                        {validatingUsername && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        {!validatingUsername && usernameAvailable === true && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        {!validatingUsername && usernameAvailable === false && <XCircle className="h-4 w-4 text-destructive" />}
                      </div>
                    </div>
                    {usernameAvailable === false && (
                      <div className="text-xs flex flex-col gap-1 mt-1 bg-destructive/10 text-destructive p-2 rounded-md">
                        <span className="font-medium flex items-center gap-1">
                          <XCircle className="h-3.5 w-3.5" /> Username is taken
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                    {generatingUsername ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                    )}
                    <span className="font-mono text-sm text-foreground">
                      {form.watch("username") || (
                        <span className="text-muted-foreground italic">Enter name below to generate…</span>
                      )}
                    </span>
                    {form.watch("username") && (
                      <span className="ml-auto rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                        Available
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" {...form.register("email")} placeholder="staff@school.edu" disabled={!!editingStaff} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            {/* Names — first/last trigger username generation on change */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  {...form.register("firstName", {
                    onChange: (e) => triggerUsernameGeneration(e.target.value, form.getValues("lastName") ?? ""),
                  })}
                />
                {form.formState.errors.firstName && (
                  <p className="text-xs text-destructive">{form.formState.errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Middle</Label>
                <Input {...form.register("middleName")} />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  {...form.register("lastName", {
                    onChange: (e) => triggerUsernameGeneration(form.getValues("firstName") ?? "", e.target.value),
                  })}
                />
                {form.formState.errors.lastName && (
                  <p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Job Title (edit only) + Hire Date */}
            <div className="grid grid-cols-2 gap-4">
              {editingStaff && (
                <div className="space-y-2">
                  <Label>Job Title *</Label>
                  <Input {...form.register("jobTitle")} />
                  {form.formState.errors.jobTitle && (
                    <p className="text-xs text-destructive">{form.formState.errors.jobTitle.message}</p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Label>Hire Date *</Label>
                <Input type="date" {...form.register("hireDate")} />
                {form.formState.errors.hireDate && (
                  <p className="text-xs text-destructive">{form.formState.errors.hireDate.message}</p>
                )}
              </div>
            </div>

            {/* Gender + DOB */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.watch("gender") ?? ""} onValueChange={(v) => form.setValue("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" {...form.register("dateOfBirth")} />
              </div>
            </div>

            {/* Teacher-specific fields */}
            {selectedStaffType === "TEACHER" && !editingStaff && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Specializations</Label>
                  <Input {...form.register("specializations")} placeholder="Math, Physics" />
                </div>
                <div className="space-y-2">
                  <Label>Years of Experience</Label>
                  <Input type="number" {...form.register("yearsOfExperience")} />
                </div>
              </div>
            )}

            {/* Initial Password (create only) */}
            {!editingStaff && (
              <div className="space-y-2">
                <Label>Initial Password</Label>
                <Input type="password" {...form.register("initialPassword")} placeholder="••••••••" />
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingStaff ? "Save Changes" : "Hire Staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Block / Activate confirmation */}
      <ConfirmDialog
        open={!!actionTarget}
        onOpenChange={(open) => !open && setActionTarget(null)}
        title={actionTarget?.action === 'activate' ? "Activate Staff Member" : "Block Staff Member"}
        description={`Are you sure you want to ${actionTarget?.action} ${actionTarget?.staff.firstName}?`}
        confirmLabel={actionTarget?.action === 'activate' ? "Activate" : "Block"}
        onConfirm={handleToggleActive}
        loading={submitting}
        destructive={actionTarget?.action === 'block'}
      />

      {/* Edit confirmation */}
      <ConfirmDialog
        open={!!pendingEditData}
        onOpenChange={(open) => !open && setPendingEditData(null)}
        title="Confirm Edit"
        description={`Are you sure you want to save these changes for ${editingStaff?.firstName}?`}
        confirmLabel="Save Changes"
        onConfirm={() => { if (pendingEditData) handleEdit(pendingEditData); }}
        loading={submitting}
        destructive={false}
      />
    </motion.div>
  );
}
