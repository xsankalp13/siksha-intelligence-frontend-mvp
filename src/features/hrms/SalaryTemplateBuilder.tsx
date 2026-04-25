import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {} from "lucide-react";
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
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type {
  SalaryTemplateCreateDTO,
  SalaryTemplateResponseDTO,
  SalaryTemplateUpdateDTO,
  StaffCategory,
} from "@/services/types/hrms";

const CATEGORY_OPTIONS: Array<{ value: StaffCategory; label: string }> = [
  { value: "TEACHING", label: "Teaching" },
  { value: "NON_TEACHING_ADMIN", label: "Non-teaching Admin" },
  { value: "NON_TEACHING_SUPPORT", label: "Non-teaching Support" },
];

const currentYear = new Date().getFullYear();

const initialForm: SalaryTemplateCreateDTO = {
  templateName: "",
  description: "",
  gradeRef: undefined,
  applicableCategory: undefined,
  academicYear: `${currentYear}-${currentYear + 1}`,
  components: [],
};

export default function SalaryTemplateBuilder() {
  const queryClient = useQueryClient();
  const originalFormRef = useRef<SalaryTemplateCreateDTO | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SalaryTemplateResponseDTO | null>(null);
  const [saveReviewOpen, setSaveReviewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalaryTemplateResponseDTO | null>(null);
  const [form, setForm] = useState<SalaryTemplateCreateDTO>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const isDirty = useMemo(
    () => !editing || JSON.stringify(form) !== JSON.stringify(originalFormRef.current),
    [form, editing],
  );

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hrms", "salary", "templates"],
    queryFn: () => hrmsService.listSalaryTemplates().then((res) => res.data),
  });

  const gradesQuery = useQuery({
    queryKey: ["hrms", "grades"],
    queryFn: () => hrmsService.listGrades().then((res) => res.data),
  });

  const componentsQuery = useQuery({
    queryKey: ["hrms", "salary", "components"],
    queryFn: () => hrmsService.listSalaryComponents().then((res) => res.data),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["hrms", "salary", "templates"] });

  const createMutation = useMutation({
    mutationFn: (payload: SalaryTemplateCreateDTO) => hrmsService.createSalaryTemplate(payload),
    onSuccess: () => {
      toast.success("Template created");
      closeForm();
      refresh();
    },
    onError: (err) => {
      const normalized = normalizeHrmsError(err);
      setFieldErrors(normalized.fieldErrors ?? {});
      toast.error(normalized.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SalaryTemplateUpdateDTO }) =>
      hrmsService.updateSalaryTemplate(id, payload),
    onSuccess: () => {
      toast.success("Template updated");
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
    mutationFn: (id: string) => hrmsService.deleteSalaryTemplate(id),
    onSuccess: () => {
      toast.success("Template deleted");
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

  const openEdit = (row: SalaryTemplateResponseDTO) => {
    const gradeRef =
      row.gradeId != null
        ? (gradesQuery.data ?? []).find((grade) => grade.gradeId === row.gradeId)?.uuid
        : undefined;

    const mappedComponents = row.components
      .map((c) => {
        const componentRef = (componentsQuery.data ?? []).find((item) => item.componentId === c.componentId)?.uuid;
        return componentRef ? { componentRef, value: c.value } : null;
      })
      .filter((item): item is { componentRef: string; value: number } => item !== null);

    setEditing(row);
    const editForm: SalaryTemplateCreateDTO = {
      templateName: row.templateName,
      description: row.description,
      gradeRef,
      applicableCategory: row.applicableCategory,
      academicYear: row.academicYear,
      components: mappedComponents,
    };
    originalFormRef.current = editForm;
    setForm(editForm);
    setFieldErrors({});
    setFormOpen(true);
  };

  const updateComponentValue = (componentRef: string, value: number) => {
    setForm((prev) => {
      const existing = prev.components.find((c) => c.componentRef === componentRef);
      if (existing) {
        return {
          ...prev,
          components: prev.components.map((c) =>
            c.componentRef === componentRef ? { ...c, value } : c,
          ),
        };
      }
      return { ...prev, components: [...prev.components, { componentRef, value }] };
    });
  };

  const submit = () => {
    if (editing) {
      updateMutation.mutate({
        id: editing.uuid,
        payload: {
          templateName: form.templateName,
          description: form.description,
          gradeRef: form.gradeRef,
          applicableCategory: form.applicableCategory,
          academicYear: form.academicYear,
          components: form.components,
        },
      });
      return;
    }
    createMutation.mutate(form);
  };

  const rows = data ?? [];

  const columns = useMemo<Column<SalaryTemplateResponseDTO>[]>(
    () => [
      { key: "templateName", header: "Template", searchable: true },
      { key: "gradeName", header: "Grade", render: (row) => row.gradeName ?? "-" },
      {
        key: "applicableCategory",
        header: "Category",
        render: (row) =>
          row.applicableCategory ? (
            <Badge variant="outline">{row.applicableCategory.replace(/_/g, " ")}</Badge>
          ) : (
            "All"
          ),
      },
      { key: "academicYear", header: "Year" },
      {
        key: "components",
        header: "Components",
        render: (row) => row.components.length,
      },
      {
        key: "active",
        header: "Status",
        render: (row) => (
          <Badge variant={row.active ? "default" : "secondary"}>
            {row.active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
    ],
    [],
  );

  if (isError) {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/30 p-4">
        <p className="text-sm text-destructive">{normalizeHrmsError(error).message}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              📄
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Salary Templates</h2>
              <p className="text-sm text-white/70">Bundle components into reusable salary structures for staff</p>
            </div>
          </div>
          <Button
            onClick={openCreate}
            className="bg-white text-violet-700 hover:bg-white/90 font-semibold gap-1.5 shadow-sm"
          >
            ➕ Add Template
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.uuid}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
        emptyMessage={isLoading ? "Loading salary templates..." : "No salary templates found."}
      />

      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Template" : "Create Template"}</DialogTitle>
            <DialogDescription>
              Templates bundle salary components for assignment to staff.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="tpl-name">Template Name</Label>
              <Input
                id="tpl-name"
                value={form.templateName}
                onChange={(e) => setForm((p) => ({ ...p, templateName: e.target.value }))}
              />
              {fieldErrors.templateName?.[0] && <p className="text-xs text-destructive">{fieldErrors.templateName[0]}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Grade (optional)</Label>
                <Select
                  value={form.gradeRef ?? "none"}
                  onValueChange={(v) => setForm((p) => ({ ...p, gradeRef: v === "none" ? undefined : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {(gradesQuery.data ?? []).map((g) => (
                      <SelectItem key={g.gradeId} value={g.uuid}>
                        {g.gradeCode} — {g.gradeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tpl-year">Academic Year</Label>
                <Input
                  id="tpl-year"
                  value={form.academicYear}
                  onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))}
                  placeholder="2025-2026"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Applicable Category (optional)</Label>
              <Select
                value={form.applicableCategory ?? "ALL"}
                onValueChange={(value) =>
                  setForm((p) => ({
                    ...p,
                    applicableCategory: value === "ALL" ? undefined : (value as StaffCategory),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All categories</SelectItem>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tpl-desc">Description</Label>
              <Textarea
                id="tpl-desc"
                value={form.description ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            {/* Component Values */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Component Values</p>
              {(componentsQuery.data ?? []).map((comp) => {
                const existing = form.components.find((c) => c.componentRef === comp.uuid);
                return (
                  <div key={comp.componentId} className="flex items-center gap-3 rounded border px-3 py-2">
                    <div className="flex-1">
                      <span className="text-sm font-medium">{comp.componentName}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({comp.type} / {comp.calculationMethod.replace(/_/g, " ")})
                      </span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      className="w-[120px]"
                      value={existing?.value ?? ""}
                      onChange={(e) => updateComponentValue(comp.uuid, Number(e.target.value || 0))}
                      placeholder={String(comp.defaultValue)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button
              onClick={() => setSaveReviewOpen(true)}
              disabled={createMutation.isPending || updateMutation.isPending || !form.templateName || !isDirty}
            >
              {editing ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReviewDialog
        open={saveReviewOpen}
        onOpenChange={setSaveReviewOpen}
        title={editing ? "Confirm Template Update" : "Confirm Template Creation"}
        description="Review template scope and component values before saving."
        severity="warning"
        confirmLabel={editing ? "Save Changes" : "Create Template"}
        isPending={createMutation.isPending || updateMutation.isPending}
        requireCheckbox
        checkboxLabel="I verified category, year, and component values for this template."
        onConfirm={submit}
      >
        <div className="space-y-1 text-sm">
          <p>Name: <span className="font-medium">{form.templateName || "-"}</span></p>
          <p>Academic Year: <span className="font-medium">{form.academicYear || "-"}</span></p>
          <p>Category: <span className="font-medium">{form.applicableCategory ?? "ALL"}</span></p>
          <p>Components: <span className="font-medium">{form.components.length}</span></p>
        </div>
      </ReviewDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete salary template?"
        description={`This will remove ${deleteTarget?.templateName ?? "this template"}.`}
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.uuid); }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
