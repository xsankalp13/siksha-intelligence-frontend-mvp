import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {  UserPlus } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import DataTable, { type Column } from "@/components/common/DataTable";
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
import { Textarea } from "@/components/ui/textarea";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";
import DesignationStaffDialog from "@/features/hrms/components/DesignationStaffDialog";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import { useAppSelector } from "@/store/hooks";
import type {
  SalaryTemplateResponseDTO,
  StaffGradeResponseDTO,
  StaffCategory,
  StaffDesignationCreateUpdateDTO,
  StaffDesignationResponseDTO,
  TeachingLevel,
} from "@/services/types/hrms";

const TEACHING_LEVEL_OPTIONS: Array<{ value: TeachingLevel; label: string }> = [
  { value: "PRIMARY", label: "Primary" },
  { value: "SECONDARY", label: "Secondary" },
  { value: "HIGHER_SECONDARY", label: "Higher Secondary" },
  { value: "PRIMARY_SECONDARY", label: "Primary & Secondary" },
  { value: "ALL", label: "All Levels" },
];

const CATEGORY_OPTIONS: Array<{ value: StaffCategory; label: string }> = [
  { value: "TEACHING", label: "Teaching" },
  { value: "NON_TEACHING_ADMIN", label: "Non-teaching Admin" },
  { value: "NON_TEACHING_SUPPORT", label: "Non-teaching Support" },
];

const initialForm: StaffDesignationCreateUpdateDTO = {
  designationCode: "",
  designationName: "",
  category: "TEACHING",
  description: "",
  sortOrder: 0,
  defaultSalaryTemplateRef: undefined,
  defaultGradeRef: undefined,
  teachingLevel: undefined,
};

const categoryBadgeVariant: Record<StaffCategory, "default" | "secondary" | "outline"> = {
  TEACHING: "default",
  NON_TEACHING_ADMIN: "secondary",
  NON_TEACHING_SUPPORT: "outline",
};

export default function DesignationManagement() {
  const queryClient = useQueryClient();
  const roles = useAppSelector((s) => s.auth.user?.roles ?? []);
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | StaffCategory>("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffDesignationResponseDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffDesignationResponseDTO | null>(null);
  const [saveReviewOpen, setSaveReviewOpen] = useState(false);
  const [form, setForm] = useState<StaffDesignationCreateUpdateDTO>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [assignDialogDesignation, setAssignDialogDesignation] = useState<StaffDesignationResponseDTO | null>(null);

  const canDelete = roles
    .map((role) => role.toUpperCase().replace(/^ROLE_/, ""))
    .includes("SUPER_ADMIN");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hrms", "designations", categoryFilter],
    queryFn: () =>
      hrmsService
        .listDesignations({ category: categoryFilter === "ALL" ? undefined : categoryFilter })
        .then((res) => res.data),
  });

  const { data: salaryTemplates } = useQuery({
    queryKey: ["hrms", "salary-templates"],
    queryFn: () => hrmsService.listSalaryTemplates().then((res) => res.data),
  });

  const { data: staffGrades } = useQuery({
    queryKey: ["hrms", "staff-grades"],
    queryFn: () => hrmsService.listGrades().then((res) => res.data),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["hrms", "designations"] });

  const saveMutation = useMutation({
    mutationFn: (payload: StaffDesignationCreateUpdateDTO) =>
      editing
        ? hrmsService.updateDesignation(editing.uuid, payload)
        : hrmsService.createDesignation(payload),
    onSuccess: () => {
      toast.success(editing ? "Designation updated" : "Designation created");
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
    mutationFn: (id: string) => hrmsService.deleteDesignation(id),
    onSuccess: () => {
      toast.success("Designation deleted");
      setDeleteTarget(null);
      refresh();
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const closeForm = () => {
    setFormOpen(false);
    setSaveReviewOpen(false);
    setEditing(null);
    setForm(initialForm);
    setFieldErrors({});
  };

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEdit = (row: StaffDesignationResponseDTO) => {
    setEditing(row);
    setForm({
      designationCode: row.designationCode,
      designationName: row.designationName,
      category: row.category,
      description: row.description ?? "",
      sortOrder: row.sortOrder,
      defaultSalaryTemplateRef: salaryTemplates?.find((t: SalaryTemplateResponseDTO) => t.templateId === row.defaultSalaryTemplateId)?.uuid,
      defaultGradeRef: staffGrades?.find((g: StaffGradeResponseDTO) => g.gradeId === row.defaultGradeId)?.uuid,
      teachingLevel: row.teachingLevel,
    });
    setFieldErrors({});
    setFormOpen(true);
  };

  const rows = data ?? [];

  const columns = useMemo<Column<StaffDesignationResponseDTO>[]>(
    () => [
      { key: "designationCode", header: "Code", searchable: true, className: "font-mono" },
      { key: "designationName", header: "Name", searchable: true },
      {
        key: "category",
        header: "Category",
        render: (row) => (
          <Badge variant={categoryBadgeVariant[row.category]}>{row.category.replace(/_/g, " ")}</Badge>
        ),
      },
      { key: "sortOrder", header: "Sort" },
      {
        key: "defaultSalaryTemplateName",
        header: "Salary Template",
        render: (row) => row.defaultSalaryTemplateName || <span className="text-muted-foreground">-</span>,
      },
      {
        key: "defaultGradeCode",
        header: "Grade",
        render: (row) => row.defaultGradeCode || <span className="text-muted-foreground">-</span>,
      },
      {
        key: "teachingLevel",
        header: "Teaching Level",
        render: (row) =>
          row.teachingLevel ? (
            <Badge variant="outline" className="text-xs">
              {TEACHING_LEVEL_OPTIONS.find((o) => o.value === row.teachingLevel)?.label ?? row.teachingLevel}
            </Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        key: "active",
        header: "Status",
        render: (row) => <Badge variant={row.active ? "default" : "secondary"}>{row.active ? "Active" : "Inactive"}</Badge>,
      },
    ],
    [],
  );

  if (isError) {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/30 p-4">
        <p className="text-sm text-destructive">{normalizeHrmsError(error).message}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              🏢
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Designation Management</h2>
              <p className="text-sm text-white/70">Configure staff roles, categories, pay templates and grades</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as "ALL" | StaffCategory)}>
              <SelectTrigger className="w-[180px] bg-white/20 border-white/30 text-white h-9 backdrop-blur-sm">
                <SelectValue placeholder="Filter category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={openCreate}
              className="bg-white text-indigo-700 hover:bg-white/90 font-semibold shadow-sm gap-1.5"
            >
              ➕ Add Designation
            </Button>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.uuid}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
        emptyMessage={isLoading ? "Loading designations..." : "No designations found."}
        customActions={(row) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
            title="Assign Staff"
            onClick={() => setAssignDialogDesignation(row)}
          >
            <UserPlus className="h-3.5 w-3.5" />
          </Button>
        )}
      />

      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Designation" : "Create Designation"}</DialogTitle>
            <DialogDescription>
              Configure designation code/name/category and display sort order.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="desig-code">Designation Code</Label>
                <Input
                  id="desig-code"
                  value={form.designationCode}
                  onChange={(e) => setForm((p) => ({ ...p, designationCode: e.target.value.toUpperCase() }))}
                  placeholder="PRINCIPAL"
                />
                {fieldErrors.designationCode?.[0] && (
                  <p className="text-xs text-destructive">{fieldErrors.designationCode[0]}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desig-name">Designation Name</Label>
                <Input
                  id="desig-name"
                  value={form.designationName}
                  onChange={(e) => setForm((p) => ({ ...p, designationName: e.target.value }))}
                  placeholder="Principal"
                />
                {fieldErrors.designationName?.[0] && (
                  <p className="text-xs text-destructive">{fieldErrors.designationName[0]}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(value) => setForm((p) => ({ ...p, category: value as StaffCategory }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desig-sort">Sort Order</Label>
                <Input
                  id="desig-sort"
                  type="number"
                  min={0}
                  value={form.sortOrder ?? 0}
                  onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value || 0) }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="desig-desc">Description</Label>
              <Textarea
                id="desig-desc"
                value={form.description ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>

            {form.category === "TEACHING" && (
              <div className="grid gap-2">
                <Label>
                  Teaching Level{" "}
                  <span className="text-xs font-normal text-muted-foreground">(backend field pending)</span>
                </Label>
                <Select
                  value={form.teachingLevel ?? "none"}
                  onValueChange={(value) =>
                    setForm((p) => ({ ...p, teachingLevel: value === "none" ? undefined : (value as TeachingLevel) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Not specified" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not specified</SelectItem>
                    {TEACHING_LEVEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Default Salary Template</Label>
                <Select
                  value={form.defaultSalaryTemplateRef || "none"}
                  onValueChange={(value) =>
                    setForm((p) => ({ ...p, defaultSalaryTemplateRef: value === "none" ? undefined : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No default template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No default template</SelectItem>
                    {salaryTemplates?.map((template) => (
                      <SelectItem key={template.uuid} value={template.uuid}>
                        {template.templateName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Default Staff Grade</Label>
                <Select
                  value={form.defaultGradeRef || "none"}
                  onValueChange={(value) =>
                    setForm((p) => ({ ...p, defaultGradeRef: value === "none" ? undefined : value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No default grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No default grade</SelectItem>
                    {staffGrades?.map((grade) => (
                      <SelectItem key={grade.uuid} value={grade.uuid}>
                        {grade.gradeCode} - {grade.gradeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button
              disabled={saveMutation.isPending || !form.designationCode || !form.designationName}
              onClick={() => setSaveReviewOpen(true)}
            >
              {editing ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReviewDialog
        open={saveReviewOpen}
        onOpenChange={setSaveReviewOpen}
        title={editing ? "Confirm Designation Update" : "Confirm Designation Creation"}
        description="Review designation details before saving."
        severity="warning"
        confirmLabel={editing ? "Save Changes" : "Create Designation"}
        isPending={saveMutation.isPending}
        requireCheckbox
        checkboxLabel="I verified designation code, category, and sort order."
        onConfirm={() => saveMutation.mutate(form)}
      >
        <div className="space-y-1 text-sm">
          <p>Code: <span className="font-medium">{form.designationCode || "-"}</span></p>
          <p>Name: <span className="font-medium">{form.designationName || "-"}</span></p>
          <p>Category: <span className="font-medium">{form.category}</span></p>
          <p>Default Salary Template: <span className="font-medium">{salaryTemplates?.find(t => t.uuid === form.defaultSalaryTemplateRef)?.templateName || "None"}</span></p>
          <p>Default Grade: <span className="font-medium">{staffGrades?.find(g => g.uuid === form.defaultGradeRef)?.gradeCode || "None"}</span></p>
          <p>Sort Order: <span className="font-medium">{form.sortOrder ?? 0}</span></p>
        </div>
      </ReviewDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete designation?"
        description={
          canDelete
            ? `This will remove ${deleteTarget?.designationName ?? "this designation"}. Delete can fail if staff are linked.`
            : "Only SUPER_ADMIN can delete designations."
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (!deleteTarget || !canDelete) return;
          deleteMutation.mutate(deleteTarget.uuid);
        }}
        loading={deleteMutation.isPending}
      />

      <DesignationStaffDialog
        open={Boolean(assignDialogDesignation)}
        onOpenChange={(open) => { if (!open) setAssignDialogDesignation(null); }}
        designation={assignDialogDesignation}
      />
    </div>
  );
}
