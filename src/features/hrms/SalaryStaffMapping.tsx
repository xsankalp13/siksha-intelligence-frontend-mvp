import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
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
import StaffSearchSelect from "@/features/hrms/components/StaffSearchSelect";
import SalaryOverrideEditor from "@/features/hrms/SalaryOverrideEditor";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type {
  StaffSalaryMappingCreateDTO,
  StaffSalaryMappingResponseDTO,
} from "@/services/types/hrms";

const todayIso = new Date().toISOString().slice(0, 10);

const initialForm: StaffSalaryMappingCreateDTO = {
  staffRef: "",
  templateRef: "",
  effectiveFrom: todayIso,
  effectiveTo: undefined,
  remarks: "",
  overrides: [],
};

export default function SalaryStaffMapping() {
  const queryClient = useQueryClient();
  const { formatDate } = useHrmsFormatters();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffSalaryMappingResponseDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffSalaryMappingResponseDTO | null>(null);
  const [previewTarget, setPreviewTarget] = useState<StaffSalaryMappingResponseDTO | null>(null);
  const [saveReviewOpen, setSaveReviewOpen] = useState(false);
  const [form, setForm] = useState<StaffSalaryMappingCreateDTO>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hrms", "salary", "mappings"],
    queryFn: () =>
      hrmsService
        .listSalaryMappings({ page: 0, size: 100, sort: ["effectiveFrom,desc"] })
        .then((res) => res.data),
  });

  const templatesQuery = useQuery({
    queryKey: ["hrms", "salary", "templates"],
    queryFn: () => hrmsService.listSalaryTemplates().then((res) => res.data),
  });

  const staffQuery = useQuery({
    queryKey: ["hrms", "staff", "dropdown"],
    queryFn: () => hrmsService.listStaffForDropdown().then((res) => res.data.content ?? []),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["hrms", "salary", "mappings"] });

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
      toast.success("Mapping deleted");
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

  const openEdit = (row: StaffSalaryMappingResponseDTO) => {
    const staffRef = (staffQuery.data ?? []).find((staff) => staff.staffId === row.staffId)?.uuid ?? "";
    const templateRef = (templatesQuery.data ?? []).find((template) => template.templateId === row.templateId)?.uuid ?? "";

    setEditing(row);
    setForm({
      staffRef,
      templateRef,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo,
      remarks: row.remarks ?? "",
      overrides: row.overrides?.map((o) => ({
        componentRef: o.componentRef,
        overrideValue: o.overrideValue,
        reason: o.reason,
      })) ?? [],
    });
    setFieldErrors({});
    setFormOpen(true);
  };

  const rows = data?.content ?? [];

  const columns = useMemo<Column<StaffSalaryMappingResponseDTO>[]>(
    () => [
      { key: "staffName", header: "Staff", searchable: true },
      { key: "employeeId", header: "Emp. ID", searchable: true },
      { key: "templateName", header: "Template", searchable: true },
      { key: "gradeCode", header: "Grade", render: (row) => row.gradeCode ?? "-" },
      {
        key: "effectiveFrom",
        header: "Effective",
        render: (row) => formatDate(row.effectiveFrom),
      },
      {
        key: "overrides",
        header: "Overrides",
        render: (row) =>
          (row.overrides?.length ?? 0) > 0 ? (
            <Badge variant="outline">{(row.overrides?.length ?? 0)} overrides</Badge>
          ) : (
            "-"
          ),
      },
      {
        key: "active",
        header: "Status",
        render: (row) => <Badge variant={row.active ? "default" : "secondary"}>{row.active ? "Active" : "Inactive"}</Badge>,
      },
      {
        key: "computed",
        header: "Preview",
        render: (row) => (
          <Button size="sm" variant="outline" onClick={() => setPreviewTarget(row)}>
            Preview
          </Button>
        ),
      },
    ],
    [formatDate],
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
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Salary Staff Mapping</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Mapping
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.uuid}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
        emptyMessage={isLoading ? "Loading salary mappings..." : "No salary mappings found."}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Salary Mapping" : "Create Salary Mapping"}</DialogTitle>
            <DialogDescription>
              Always validate mapping with computed preview before confirmation.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <StaffSearchSelect
              label="Staff"
              value={form.staffRef || null}
              onChange={(uuid: string | null) => setForm((p) => ({ ...p, staffRef: uuid ?? "" }))}
              disabled={staffQuery.isLoading || Boolean(editing)}
              error={fieldErrors.staffRef?.[0] ?? fieldErrors.staffId?.[0]}
            />

            <div className="grid gap-2">
              <Label>Template</Label>
              <Select
                value={form.templateRef || undefined}
                onValueChange={(v) => setForm((p) => ({ ...p, templateRef: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>
                  {(templatesQuery.data ?? []).map((t) => (
                    <SelectItem key={t.templateId} value={t.uuid}>
                      {t.templateName} {t.gradeName ? `(${t.gradeName})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(fieldErrors.templateRef?.[0] ?? fieldErrors.templateId?.[0]) && (
                <p className="text-xs text-destructive">{fieldErrors.templateRef?.[0] ?? fieldErrors.templateId?.[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="map-from">Effective From</Label>
                <Input
                  id="map-from"
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm((p) => ({ ...p, effectiveFrom: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="map-to">Effective To (optional)</Label>
                <Input
                  id="map-to"
                  type="date"
                  value={form.effectiveTo ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, effectiveTo: e.target.value || undefined }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="map-remarks">Remarks</Label>
              <Textarea
                id="map-remarks"
                value={form.remarks ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                placeholder="Reason for mapping / seniority override"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button
              onClick={() => setSaveReviewOpen(true)}
              disabled={saveMutation.isPending || !form.staffRef || !form.templateRef || !form.effectiveFrom}
            >
              {editing ? "Save Changes" : "Create"}
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
        checkboxLabel="I verified the mapping details and effective dates."
        onConfirm={() => saveMutation.mutate(form)}
      >
        <div className="space-y-1 text-sm">
          <p>Staff Ref: <span className="font-medium">{form.staffRef || "-"}</span></p>
          <p>Template Ref: <span className="font-medium">{form.templateRef || "-"}</span></p>
          <p>Effective: <span className="font-medium">{form.effectiveFrom}{form.effectiveTo ? ` to ${form.effectiveTo}` : ""}</span></p>
          <p>Remarks: <span className="font-medium">{form.remarks?.trim() || "-"}</span></p>
        </div>
      </ReviewDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete salary mapping?"
        description={`This will remove mapping for ${deleteTarget?.staffName ?? "staff"} #${deleteTarget?.mappingId ?? ""}.`}
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.uuid); }}
        loading={deleteMutation.isPending}
      />

      {previewTarget && <SalaryOverrideEditor selectedMappingUuid={previewTarget.uuid} />}
    </div>
  );
}
