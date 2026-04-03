import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Plus,
  Loader2,
  Users,
  Upload,
  ChevronRight,
  RefreshCw,
  Search,
  ChevronLeft,
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
  type StaffSummaryDTO,
} from "@/services/admin";

import BulkDataUpload from "@/features/bulk-upload/BulkDataUpload";
import { BulkPhotoUploadDialog } from "@/features/uis/id-card/BulkPhotoUploadDialog";
import { idCardService, triggerBlobDownload } from "@/services/idCard";

// ── Types ───────────────────────────────────────────────────────────
type StaffType = "TEACHER" | "PRINCIPAL" | "LIBRARIAN";

const STAFF_TYPE_OPTIONS: { value: StaffType; label: string }[] = [
  { value: "TEACHER", label: "Teacher" },
  { value: "PRINCIPAL", label: "Principal" },
  { value: "LIBRARIAN", label: "Librarian" },
];

// ── Zod Schema ──────────────────────────────────────────────────────
const staffSchema = z.object({
  username: z.string().min(3, "Min 3 characters").max(50),
  email: z.string().email("Invalid email"),
  firstName: z.string().min(1, "Required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Required"),
  jobTitle: z.string().min(1, "Required"),
  hireDate: z.string().min(1, "Required"),
  staffType: z.enum(["TEACHER", "PRINCIPAL", "LIBRARIAN"]),
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
  const [editingStaff, setEditingStaff] = useState<StaffSummaryDTO | null>(null);
  const [pendingEditData, setPendingEditData] = useState<StaffFormData | null>(null);
  const [actionTarget, setActionTarget] = useState<{ staff: StaffSummaryDTO; action: 'activate' | 'block' } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStaffType, setSelectedStaffType] = useState<StaffType>("TEACHER");
  const [photoUploadOpen, setPhotoUploadOpen] = useState(false);
  
  const form = useForm<StaffFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(staffSchema) as any,
    defaultValues: {
      username: "", email: "", firstName: "", middleName: "", lastName: "",
      jobTitle: "", hireDate: "", staffType: "TEACHER", gender: "",
      dateOfBirth: "", officeLocation: "", initialPassword: "",
    },
  });

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
        setTotalElements(res.data.totalElements);
        setTotalPages(res.data.totalPages);
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
      staffType: s.staffType as StaffType,
      gender: s.gender || "",
      dateOfBirth: s.dateOfBirth || "",
      officeLocation: s.officeLocation || "",
    });
    setFormOpen(true);
  };

  // ── Submit ────────────────────────────────────────────────────────
  const onSubmit = (data: StaffFormData) => {
    if (editingStaff) {
      setPendingEditData(data); // triggers confirmation dialog
    } else {
      handleCreate(data);
    }
  };

  const handleEdit = async (data: StaffFormData) => {
    if (!editingStaff) return;
    setSubmitting(true);
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
    try {
      if (data.staffType === "TEACHER") {
        await adminService.createTeacher({
          username: data.username,
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
          specializations: data.specializations ? [data.specializations] : [],
          certifications: data.certifications ? [data.certifications] : [],
          yearsOfExperience: data.yearsOfExperience,
          educationLevel: data.educationLevel,
        });
      } else if (data.staffType === "PRINCIPAL") {
        await adminService.createPrincipal({
          username: data.username,
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
          schoolLevelManaged: data.schoolLevelManaged as never,
          administrativeCertifications: data.adminCertifications ? [data.adminCertifications] : [],
        });
      } else if (data.staffType === "LIBRARIAN") {
        await adminService.createLibrarian({
          username: data.username,
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
          hasMlisDegree: data.hasMlisDegree,
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

  // ── Toggle Activation ────────────────────────────────────────────────────────
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
    setBulkOpen(false);
    setPage(0);
    setSearch("");
    setSearchInput("");
    await fetchStaff(0, "", staffTypeFilter);
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
                    <Link to={`/dashboard/admin/users/staff/${s.uuid}`} className="hover:underline text-primary transition-colors">
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
                            } catch (e) {
                              toast.error("Failed to download ID Card");
                            }
                          }}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                        </Button>
                      </motion.div>
                      <Link to={`/dashboard/admin/users/staff/${s.uuid}`}>
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
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
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
          />
        </DialogContent>
      </Dialog>
      
      <BulkPhotoUploadDialog 
        open={photoUploadOpen} 
        onClose={() => setPhotoUploadOpen(false)} 
        userType="staff"
      />

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Staff Member" : "Hire New Staff"}</DialogTitle>
            <DialogDescription>
              {editingStaff ? "Update staff information." : "Fill in the details to hire a new staff member."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Staff Type (create only) */}
            {!editingStaff && (
              <div className="space-y-2">
                <Label>Staff Type *</Label>
                <Select
                  value={selectedStaffType}
                  onValueChange={(val) => {
                    setSelectedStaffType(val as StaffType);
                    form.setValue("staffType", val as StaffType);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Username & Email */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username *</Label>
                <Input {...form.register("username")} placeholder="john.doe" disabled={!!editingStaff} />
                {form.formState.errors.username && (
                  <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" {...form.register("email")} placeholder="staff@school.edu" disabled={!!editingStaff} />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Names */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input {...form.register("firstName")} />
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
                <Input {...form.register("lastName")} />
                {form.formState.errors.lastName && (
                  <p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Job Title + Hire Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job Title *</Label>
                <Input {...form.register("jobTitle")} />
                {form.formState.errors.jobTitle && (
                  <p className="text-xs text-destructive">{form.formState.errors.jobTitle.message}</p>
                )}
              </div>
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

            {/* Teacher-specific */}
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

            {/* Initial Password */}
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

      {/* Action confirmation (Block / Activate) */}
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
