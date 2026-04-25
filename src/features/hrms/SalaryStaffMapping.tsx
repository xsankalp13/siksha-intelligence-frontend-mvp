import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  
  Search,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";
import StaffSearchSelect from "@/features/hrms/components/StaffSearchSelect";
import SalaryOverrideEditor from "@/features/hrms/SalaryOverrideEditor";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type {
  StaffSalaryMappingBulkCreateDTO,
  StaffSalaryMappingCreateDTO,
  StaffSalaryMappingResponseDTO,
  UnmappedStaffDTO,
} from "@/services/types/hrms";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

const todayIso = new Date().toISOString().slice(0, 10);

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700 ring-violet-200",
  "bg-blue-100 text-blue-700 ring-blue-200",
  "bg-emerald-100 text-emerald-700 ring-emerald-200",
  "bg-amber-100 text-amber-700 ring-amber-200",
  "bg-rose-100 text-rose-700 ring-rose-200",
  "bg-sky-100 text-sky-700 ring-sky-200",
  "bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-200",
  "bg-teal-100 text-teal-700 ring-teal-200",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPeriod(from: string, to?: string): string {
  if (!to) return `${fmtDate(from)} → ongoing`;
  return `${fmtDate(from)} – ${fmtDate(to)}`;
}

function isPast(to?: string): boolean {
  if (!to) return false;
  return new Date(to) < new Date(new Date().toDateString());
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StaffAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1",
        avatarColor(name),
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  variant = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  variant?: "default" | "warn" | "success" | "muted";
}) {
  const variantStyles: Record<string, string> = {
    default: "bg-primary/5 text-primary border-primary/10",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    muted: "bg-muted/60 text-muted-foreground border-muted",
  };
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 min-w-[140px]",
        variantStyles[variant],
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-70" />
      <div>
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="text-xs font-normal opacity-70">{label}</p>
      </div>
    </div>
  );
}

function MappingTable({
  rows,
  isLoading,
  emptyMessage,
  onEdit,
  onDelete,
  onPreview,
}: {
  rows: StaffSalaryMappingResponseDTO[];
  isLoading: boolean;
  emptyMessage: string;
  onEdit: (row: StaffSalaryMappingResponseDTO) => void;
  onDelete: (row: StaffSalaryMappingResponseDTO) => void;
  onPreview: (row: StaffSalaryMappingResponseDTO) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-14 text-muted-foreground">
        <Users className="h-8 w-8 opacity-40" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Staff</th>
            <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Template</th>
            <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">Period</th>
            <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground xl:table-cell">Overrides</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => {
            const historical = isPast(row.effectiveTo);
            const overrideCount = row.overrides?.length ?? 0;
            return (
              <tr
                key={row.uuid}
                className={cn("group transition-colors hover:bg-muted/30", historical && "opacity-70")}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <StaffAvatar name={row.staffName} />
                    <div className="min-w-0">
                      <p className="truncate font-medium leading-tight">{row.staffName}</p>
                      <p className="text-xs text-muted-foreground">{row.employeeId}</p>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <div className="flex flex-col gap-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "w-fit font-medium",
                        row.gradeCode
                          ? "border-violet-200 bg-violet-50 text-violet-700"
                          : "border-muted bg-muted/40 text-muted-foreground",
                      )}
                    >
                      {row.templateName}
                    </Badge>
                    {row.gradeCode && (
                      <span className="text-xs text-muted-foreground">{row.gradeCode}</span>
                    )}
                  </div>
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <div className="flex items-center gap-2">
                    {historical ? (
                      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    )}
                    <span className={cn("text-xs", historical ? "text-muted-foreground" : "text-foreground")}>
                      {formatPeriod(row.effectiveFrom, row.effectiveTo)}
                    </span>
                  </div>
                </td>
                <td className="hidden px-4 py-3 xl:table-cell">
                  {overrideCount > 0 ? (
                    <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700 font-medium">
                      {overrideCount} override{overrideCount !== 1 ? "s" : ""}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs" onClick={() => onPreview(row)}>
                      Preview
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2.5 text-xs" onClick={() => onEdit(row)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onDelete(row)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UnmappedStaffTable({
  rows,
  isLoading,
  onAssign,
}: {
  rows: UnmappedStaffDTO[];
  isLoading: boolean;
  onAssign: (staff: UnmappedStaffDTO) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 py-14 text-emerald-700">
        <UserCheck className="h-8 w-8 opacity-60" />
        <p className="text-sm font-medium">All active staff have salary mappings</p>
        <p className="text-xs opacity-70">No unmapped staff found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-amber-200/60">
      <div className="bg-amber-50/60 px-4 py-2.5 text-xs font-medium text-amber-700 flex items-center gap-2">
        <AlertCircle className="h-3.5 w-3.5" />
        {rows.length} staff member{rows.length !== 1 ? "s" : ""} without a current salary mapping
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Staff</th>
            <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">Designation</th>
            <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">Category</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((staff) => (
            <tr key={staff.uuid} className="group transition-colors hover:bg-muted/30">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <StaffAvatar name={staff.staffName} />
                  <div className="min-w-0">
                    <p className="truncate font-medium leading-tight">{staff.staffName}</p>
                    <p className="text-xs text-muted-foreground">{staff.employeeId}</p>
                  </div>
                </div>
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <span className="text-sm text-muted-foreground">{staff.designationName ?? "—"}</span>
              </td>
              <td className="hidden px-4 py-3 lg:table-cell">
                {staff.category ? (
                  <Badge variant="outline" className="text-xs capitalize">
                    {staff.category.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                  onClick={() => onAssign(staff)}
                >
                  Assign Template
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const initialForm: StaffSalaryMappingCreateDTO = {
  staffRef: "",
  templateRef: "",
  effectiveFrom: todayIso,
  effectiveTo: undefined,
  remarks: "",
  overrides: [],
};

const initialBulkForm: StaffSalaryMappingBulkCreateDTO = {
  templateRef: "",
  staffRefs: [],
  effectiveFrom: todayIso,
  effectiveTo: undefined,
  remarks: "",
};

type ViewTab = "current" | "historical" | "unmapped" | "bulk";

// ── Main Component ────────────────────────────────────────────────────────────

export default function SalaryStaffMapping() {
  const queryClient = useQueryClient();
  const originalFormRef = useRef<StaffSalaryMappingCreateDTO | null>(null);

  // View & filter state
  const [view, setView] = useState<ViewTab>("current");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterTemplate, setFilterTemplate] = useState("");
  const [filterGrade, setFilterGrade] = useState("");

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffSalaryMappingResponseDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffSalaryMappingResponseDTO | null>(null);
  const [previewTarget, setPreviewTarget] = useState<StaffSalaryMappingResponseDTO | null>(null);
  const [saveReviewOpen, setSaveReviewOpen] = useState(false);
  const [form, setForm] = useState<StaffSalaryMappingCreateDTO>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Bulk state
  const [bulkForm, setBulkForm] = useState<StaffSalaryMappingBulkCreateDTO>(initialBulkForm);
  const [staffSearch, setStaffSearch] = useState("");
  const [showAllStaffInBulk, setShowAllStaffInBulk] = useState(false);

  const isDirty = useMemo(
    () => !editing || JSON.stringify(form) !== JSON.stringify(originalFormRef.current),
    [form, editing],
  );

  // ── Queries ──────────────────────────────────────────────────────────────────

  const currentQuery = useQuery({
    queryKey: ["hrms", "salary", "mappings", "current"],
    queryFn: () =>
      hrmsService
        .listSalaryMappings({ view: "CURRENT", page: 0, size: 500, sort: ["effectiveFrom,desc"] })
        .then((r) => r.data),
  });

  const historicalQuery = useQuery({
    queryKey: ["hrms", "salary", "mappings", "historical"],
    queryFn: () =>
      hrmsService
        .listSalaryMappings({ view: "HISTORICAL", page: 0, size: 500, sort: ["effectiveFrom,desc"] })
        .then((r) => r.data),
    enabled: view === "historical",
  });

  const unmappedQuery = useQuery({
    queryKey: ["hrms", "salary", "unmapped-staff"],
    queryFn: () => hrmsService.listUnmappedStaff().then((r) => r.data),
  });

  const templatesQuery = useQuery({
    queryKey: ["hrms", "salary", "templates"],
    queryFn: () => hrmsService.listSalaryTemplates().then((r) => r.data),
  });

  const staffDropdownQuery = useQuery({
    queryKey: ["hrms", "staff", "dropdown"],
    queryFn: () => hrmsService.listStaffForDropdown().then((r) => r.data.content ?? []),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["hrms", "salary", "mappings"] });
    queryClient.invalidateQueries({ queryKey: ["hrms", "salary", "unmapped-staff"] });
  };

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: (payload: StaffSalaryMappingCreateDTO) =>
      editing
        ? hrmsService.updateSalaryMapping(editing.uuid, payload)
        : hrmsService.createSalaryMapping(payload),
    onSuccess: () => {
      toast.success(editing ? "Mapping updated" : "Mapping created");
      closeForm();
      refresh();
    },
    onError: (err) => {
      const normalized = normalizeHrmsError(err);
      setFieldErrors(normalized.fieldErrors ?? {});
      toast.error(normalized.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hrmsService.deleteSalaryMapping(id),
    onSuccess: () => {
      toast.success("Mapping removed");
      setDeleteTarget(null);
      refresh();
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const bulkMutation = useMutation({
    mutationFn: (payload: StaffSalaryMappingBulkCreateDTO) =>
      hrmsService.bulkCreateSalaryMappings(payload),
    onSuccess: (res) => {
      const count = res.data?.successCount ?? 0;
      toast.success(`Bulk assignment complete — ${count} mapping${count !== 1 ? "s" : ""} created`);
      setBulkForm(initialBulkForm);
      setStaffSearch("");
      refresh();
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  // ── Derived data ──────────────────────────────────────────────────────────────

  const currentRows = currentQuery.data?.content ?? [];
  const historicalRows = historicalQuery.data?.content ?? [];
  const unmappedRows = unmappedQuery.data ?? [];
  const templates = templatesQuery.data ?? [];

  const gradeOptions = useMemo(
    () =>
      Array.from(
        new Map(
          templates
            .filter((t) => t.gradeCode)
            .map((t) => [t.gradeCode!, { code: t.gradeCode!, name: t.gradeName ?? t.gradeCode! }]),
        ).values(),
      ),
    [templates],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const applyFilters = (rows: StaffSalaryMappingResponseDTO[]) =>
    rows.filter((r) => {
      const q = filterSearch.toLowerCase();
      const matchSearch =
        !q ||
        r.staffName.toLowerCase().includes(q) ||
        r.employeeId.toLowerCase().includes(q) ||
        r.templateName.toLowerCase().includes(q);
      const matchTemplate = !filterTemplate || String(r.templateId) === filterTemplate;
      const matchGrade = !filterGrade || r.gradeCode === filterGrade;
      return matchSearch && matchTemplate && matchGrade;
    });

  const filteredCurrent = useMemo(
    () => applyFilters(currentRows),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentRows, filterSearch, filterTemplate, filterGrade],
  );
  const filteredHistorical = useMemo(
    () => applyFilters(historicalRows),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [historicalRows, filterSearch, filterTemplate, filterGrade],
  );

  const filteredUnmapped = useMemo(() => {
    const q = filterSearch.toLowerCase();
    return !q
      ? unmappedRows
      : unmappedRows.filter(
          (s) =>
            s.staffName.toLowerCase().includes(q) ||
            s.employeeId.toLowerCase().includes(q) ||
            (s.designationName ?? "").toLowerCase().includes(q),
        );
  }, [unmappedRows, filterSearch]);

  const totalActive = currentQuery.data?.totalElements ?? currentRows.length;
  const totalUnmapped = unmappedRows.length;
  const templatesInUse = useMemo(
    () => new Set(currentRows.map((r) => r.templateId)).size,
    [currentRows],
  );
  const withOverrides = useMemo(
    () => currentRows.filter((r) => (r.overrides?.length ?? 0) > 0).length,
    [currentRows],
  );

  const allStaff = staffDropdownQuery.data ?? [];
  const currentMappedIds = useMemo(
    () => new Set(currentRows.map((r) => r.staffId)),
    [currentRows],
  );

  const bulkStaffPool = useMemo(() => {
    const base = showAllStaffInBulk
      ? allStaff
      : allStaff.filter((s) => !currentMappedIds.has(s.staffId));
    const q = staffSearch.toLowerCase();
    return !q
      ? base
      : base.filter((s) => {
          const name = [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ");
          return name.toLowerCase().includes(q) || s.employeeId?.toLowerCase().includes(q);
        });
  }, [allStaff, showAllStaffInBulk, currentMappedIds, staffSearch]);

  const selectedTemplate = templates.find((t) => t.uuid === form.templateRef);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const closeForm = () => {
    setFormOpen(false);
    setSaveReviewOpen(false);
    setEditing(null);
    setForm(initialForm);
    setFieldErrors({});
  };

  const openCreate = (prefilledStaffRef?: string) => {
    setEditing(null);
    setForm({ ...initialForm, staffRef: prefilledStaffRef ?? "" });
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEdit = (row: StaffSalaryMappingResponseDTO) => {
    const staffRef =
      (staffDropdownQuery.data ?? []).find((s) => s.staffId === row.staffId)?.uuid ?? "";
    const templateRef =
      (templatesQuery.data ?? []).find((t) => t.templateId === row.templateId)?.uuid ?? "";
    setEditing(row);
    const editForm: StaffSalaryMappingCreateDTO = {
      staffRef,
      templateRef,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo,
      remarks: row.remarks ?? "",
      overrides:
        row.overrides?.map((o) => ({
          componentRef: o.componentRef,
          overrideValue: o.overrideValue,
          reason: o.reason,
        })) ?? [],
    };
    originalFormRef.current = editForm;
    setForm(editForm);
    setFieldErrors({});
    setFormOpen(true);
  };

  const clearFilters = () => {
    setFilterSearch("");
    setFilterTemplate("");
    setFilterGrade("");
  };

  const hasFilters = Boolean(filterSearch || filterTemplate || filterGrade);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-pink-600 to-fuchsia-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              💸
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Salary Mapping</h2>
              <p className="text-sm text-white/70">Assign salary templates to staff and manage compensation structures</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => setView("bulk")}
              className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm gap-1.5"
            >
              👥 Bulk Assign
            </Button>
            <Button
              onClick={() => { setView("current"); openCreate(); }}
              className="bg-white text-rose-700 hover:bg-white/90 font-semibold gap-1.5 shadow-sm"
            >
              ➕ Assign Template
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <StatChip icon={CheckCircle2} label="Active Mappings" value={totalActive} variant="success" />
        <StatChip
          icon={UserX}
          label="Unmapped Staff"
          value={totalUnmapped}
          variant={totalUnmapped > 0 ? "warn" : "muted"}
        />
        <StatChip icon={TrendingUp} label="Templates in Use" value={templatesInUse} variant="default" />
        <StatChip icon={Zap} label="With Overrides" value={withOverrides} variant="muted" />
      </div>

      {/* Main Tabs */}
      <Tabs value={view} onValueChange={(v) => { setView(v as ViewTab); clearFilters(); }}>
        <TabsList>
          <TabsTrigger value="current" className="gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Current
            {currentRows.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {currentRows.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="historical" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Historical
          </TabsTrigger>
          <TabsTrigger value="unmapped" className="gap-1.5">
            <UserX className="h-3.5 w-3.5" />
            Unmapped
            {totalUnmapped > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                {totalUnmapped}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="bulk" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Bulk Assign
          </TabsTrigger>
        </TabsList>

        {/* Filter bar */}
        {(view === "current" || view === "historical" || view === "unmapped") && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-sm"
                placeholder="Search by name or employee ID…"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
              />
              {filterSearch && (
                <button
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setFilterSearch("")}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {view !== "unmapped" && (
              <>
                <Select
                  value={filterTemplate || "all"}
                  onValueChange={(v) => setFilterTemplate(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="h-8 w-auto min-w-[150px] text-sm">
                    <SelectValue placeholder="All templates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All templates</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.templateId} value={String(t.templateId)}>
                        {t.templateName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filterGrade || "all"}
                  onValueChange={(v) => setFilterGrade(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="h-8 w-auto min-w-[130px] text-sm">
                    <SelectValue placeholder="All grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All grades</SelectItem>
                    {gradeOptions.map((g) => (
                      <SelectItem key={g.code} value={g.code}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs text-muted-foreground"
                onClick={clearFilters}
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        )}

        {/* Current Tab */}
        <TabsContent value="current" className="m-0 mt-4">
          <MappingTable
            rows={filteredCurrent}
            isLoading={currentQuery.isLoading}
            emptyMessage={
              hasFilters
                ? "No mappings match your filters."
                : "No current salary mappings. Click ‘Assign Template’ to get started."
            }
            onEdit={openEdit}
            onDelete={(row) => setDeleteTarget(row)}
            onPreview={(row) => setPreviewTarget(row)}
          />
        </TabsContent>

        {/* Historical Tab */}
        <TabsContent value="historical" className="m-0 mt-4">
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50/60 px-3 py-2 text-xs text-sky-700">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            Historical mappings are closed (effectiveTo is in the past). Shown for audit purposes only.
          </div>
          <MappingTable
            rows={filteredHistorical}
            isLoading={historicalQuery.isLoading}
            emptyMessage={
              hasFilters
                ? "No historical mappings match your filters."
                : "No historical salary mappings found."
            }
            onEdit={openEdit}
            onDelete={(row) => setDeleteTarget(row)}
            onPreview={(row) => setPreviewTarget(row)}
          />
        </TabsContent>

        {/* Unmapped Tab */}
        <TabsContent value="unmapped" className="m-0 mt-4">
          <UnmappedStaffTable
            rows={filteredUnmapped}
            isLoading={unmappedQuery.isLoading}
            onAssign={(staff) => {
              setView("current");
              openCreate(staff.uuid);
            }}
          />
        </TabsContent>

        {/* Bulk Assign Tab */}
        <TabsContent value="bulk" className="m-0 mt-4">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Bulk Salary Template Assignment
              </CardTitle>
              <CardDescription>
                Select a template and multiple staff members. Each staff gets an individual mapping
                record. By default, only unmapped staff are shown below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>
                  Salary Template <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={bulkForm.templateRef || undefined}
                  onValueChange={(v) => setBulkForm((p) => ({ ...p, templateRef: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.templateId} value={t.uuid}>
                        {t.templateName}
                        {t.gradeName ? ` (${t.gradeName})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Effective From <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={bulkForm.effectiveFrom}
                    onChange={(e) => setBulkForm((p) => ({ ...p, effectiveFrom: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Effective To (optional)</Label>
                  <Input
                    type="date"
                    value={bulkForm.effectiveTo ?? ""}
                    onChange={(e) =>
                      setBulkForm((p) => ({ ...p, effectiveTo: e.target.value || undefined }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea
                  placeholder="e.g. Annual revision FY 2025-26"
                  value={bulkForm.remarks ?? ""}
                  onChange={(e) => setBulkForm((p) => ({ ...p, remarks: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>
                    Select Staff <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex items-center gap-3">
                    {bulkForm.staffRefs.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {bulkForm.staffRefs.length} selected
                      </span>
                    )}
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <Checkbox
                        checked={showAllStaffInBulk}
                        onCheckedChange={(c) => {
                          setShowAllStaffInBulk(Boolean(c));
                          setBulkForm((p) => ({ ...p, staffRefs: [] }));
                        }}
                      />
                      Show all staff
                    </label>
                  </div>
                </div>
                {!showAllStaffInBulk && unmappedRows.length > 0 && (
                  <p className="text-xs text-amber-600">
                    Showing {unmappedRows.length} unmapped staff. Toggle to include all.
                  </p>
                )}
                <Input
                  placeholder="Search by name or employee ID…"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                />
                <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
                  {staffDropdownQuery.isLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : bulkStaffPool.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground text-center">No staff found</p>
                  ) : (
                    bulkStaffPool.map((staff) => {
                      const checked = bulkForm.staffRefs.includes(staff.uuid);
                      const staffName = [staff.firstName, staff.middleName, staff.lastName]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <label
                          key={staff.uuid}
                          className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 cursor-pointer"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(c) =>
                              setBulkForm((p) => ({
                                ...p,
                                staffRefs: c
                                  ? [...p.staffRefs, staff.uuid]
                                  : p.staffRefs.filter((r) => r !== staff.uuid),
                              }))
                            }
                          />
                          <StaffAvatar name={staffName} className="h-7 w-7 text-[10px]" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight">{staffName}</p>
                            <p className="text-xs text-muted-foreground">
                              {staff.employeeId}
                              {staff.designationName ? ` · ${staff.designationName}` : ""}
                            </p>
                          </div>
                          {currentMappedIds.has(staff.staffId) && (
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              mapped
                            </Badge>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
                <div className="flex justify-between text-xs">
                  <button
                    type="button"
                    className="text-primary underline"
                    onClick={() =>
                      setBulkForm((p) => ({ ...p, staffRefs: bulkStaffPool.map((s) => s.uuid) }))
                    }
                  >
                    Select all visible
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground underline"
                    onClick={() => setBulkForm((p) => ({ ...p, staffRefs: [] }))}
                  >
                    Clear all
                  </button>
                </div>
              </div>

              <Button
                className="w-full"
                disabled={
                  !bulkForm.templateRef ||
                  bulkForm.staffRefs.length === 0 ||
                  !bulkForm.effectiveFrom ||
                  bulkMutation.isPending
                }
                onClick={() => bulkMutation.mutate(bulkForm)}
              >
                {bulkMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning {bulkForm.staffRefs.length} staff…
                  </>
                ) : (
                  `Assign to ${bulkForm.staffRefs.length || "0"} Staff`
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Salary Mapping" : "Assign Salary Template"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Modify the effective dates, template, or remarks. Overlapping mappings are auto-closed."
                : "Link a salary template to staff. Previous overlapping mappings will be auto-closed."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <StaffSearchSelect
              label="Staff"
              value={form.staffRef || null}
              onChange={(uuid: string | null) => setForm((p) => ({ ...p, staffRef: uuid ?? "" }))}
              disabled={Boolean(editing)}
              error={fieldErrors.staffRef?.[0] ?? fieldErrors.staffId?.[0]}
            />

            <div className="grid gap-2">
              <Label>
                Template <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.templateRef || undefined}
                onValueChange={(v) => setForm((p) => ({ ...p, templateRef: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.templateId} value={t.uuid}>
                      {t.templateName}
                      {t.gradeName ? ` (${t.gradeName})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <div className="flex gap-3 text-xs text-muted-foreground rounded-md bg-muted/40 px-3 py-2">
                  <span className="text-emerald-600 font-medium">
                    {selectedTemplate.components?.filter((c) => c.type === "EARNING").length ?? 0} earnings
                  </span>
                  <span className="text-rose-500 font-medium">
                    {selectedTemplate.components?.filter((c) => c.type === "DEDUCTION").length ?? 0} deductions
                  </span>
                  {selectedTemplate.gradeName && (
                    <span>· Grade: {selectedTemplate.gradeName}</span>
                  )}
                </div>
              )}
              {(fieldErrors.templateRef?.[0] ?? fieldErrors.templateId?.[0]) && (
                <p className="text-xs text-destructive">
                  {fieldErrors.templateRef?.[0] ?? fieldErrors.templateId?.[0]}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="map-from">
                  Effective From <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="map-from"
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm((p) => ({ ...p, effectiveFrom: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="map-to">Effective To</Label>
                <Input
                  id="map-to"
                  type="date"
                  value={form.effectiveTo ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, effectiveTo: e.target.value || undefined }))
                  }
                />
                <p className="text-[10px] text-muted-foreground">Leave blank for open-ended</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="map-remarks">Remarks</Label>
              <Textarea
                id="map-remarks"
                rows={2}
                value={form.remarks ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                placeholder="e.g. Annual revision — FY 2025-26"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button
              onClick={() => setSaveReviewOpen(true)}
              disabled={
                saveMutation.isPending ||
                !form.staffRef ||
                !form.templateRef ||
                !form.effectiveFrom ||
                !isDirty
              }
            >
              {editing ? "Save Changes" : "Create Mapping"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReviewDialog
        open={saveReviewOpen}
        onOpenChange={setSaveReviewOpen}
        title={editing ? "Confirm Mapping Update" : "Confirm Mapping Creation"}
        description="Please review staff, template, and effective dates before saving."
        severity="warning"
        confirmLabel={editing ? "Save Changes" : "Create Mapping"}
        isPending={saveMutation.isPending}
        requireCheckbox
        checkboxLabel="I have verified the mapping details and effective dates."
        onConfirm={() => saveMutation.mutate(form)}
      >
        <div className="space-y-1 text-sm">
          <p>
            Template: <span className="font-medium">{selectedTemplate?.templateName ?? form.templateRef ?? "—"}</span>
          </p>
          <p>
            Effective:{" "}
            <span className="font-medium">
              {form.effectiveFrom}
              {form.effectiveTo ? ` → ${form.effectiveTo}` : " (open-ended)"}
            </span>
          </p>
          {form.remarks?.trim() && (
            <p>
              Remarks: <span className="font-medium">{form.remarks}</span>
            </p>
          )}
        </div>
      </ReviewDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Remove salary mapping?"
        description={`This will soft-delete the mapping for ${deleteTarget?.staffName ?? "staff"} (${deleteTarget?.templateName ?? ""}).`}
        confirmLabel="Remove"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.uuid);
        }}
        loading={deleteMutation.isPending}
      />

      <Dialog
        open={Boolean(previewTarget)}
        onOpenChange={(open) => {
          if (!open) setPreviewTarget(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-none bg-transparent shadow-none">
          {previewTarget && <SalaryOverrideEditor selectedMappingUuid={previewTarget.uuid} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
