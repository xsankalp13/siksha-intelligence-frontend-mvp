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
import { Switch } from "@/components/ui/switch";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type {
  LeaveTypeConfigCreateUpdateDTO,
  LeaveTypeConfigResponseDTO,
  StaffCategory,
} from "@/services/types/hrms";

const STAFF_CATEGORY_OPTIONS: Array<{ value: StaffCategory; label: string }> = [
  { value: "TEACHING", label: "Teaching" },
  { value: "NON_TEACHING_ADMIN", label: "Non-teaching Admin" },
  { value: "NON_TEACHING_SUPPORT", label: "Non-teaching Support" },
];

const initialForm: LeaveTypeConfigCreateUpdateDTO = {
  leaveCode: "",
  displayName: "",
  description: "",
  annualQuota: 0,
  carryForwardAllowed: false,
  maxCarryForward: 0,
  encashmentAllowed: false,
  minDaysBeforeApply: 0,
  maxConsecutiveDays: undefined,
  requiresDocument: false,
  documentRequiredAfterDays: undefined,
  isPaid: true,
  sortOrder: 0,
};

export default function LeaveTypeConfig() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LeaveTypeConfigResponseDTO | null>(null);
  const [editing, setEditing] = useState<LeaveTypeConfigResponseDTO | null>(null);
  const [saveReviewOpen, setSaveReviewOpen] = useState(false);
  const [form, setForm] = useState<LeaveTypeConfigCreateUpdateDTO>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hrms", "leave-types"],
    queryFn: () => hrmsService.listLeaveTypes().then((res) => res.data),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["hrms", "leave-types"] });

  const saveMutation = useMutation({
    mutationFn: (payload: LeaveTypeConfigCreateUpdateDTO) =>
      editing
        ? hrmsService.updateLeaveType(editing.uuid, payload)
        : hrmsService.createLeaveType(payload),
    onSuccess: () => {
      toast.success(editing ? "Leave type updated" : "Leave type created");
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
    mutationFn: (id: string) => hrmsService.deleteLeaveType(id),
    onSuccess: () => {
      toast.success("Leave type deleted");
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

  const openEdit = (row: LeaveTypeConfigResponseDTO) => {
    setEditing(row);
    setForm({
      leaveCode: row.leaveCode,
      displayName: row.displayName,
      description: row.description,
      annualQuota: row.annualQuota,
      carryForwardAllowed: row.carryForwardAllowed,
      maxCarryForward: row.maxCarryForward,
      encashmentAllowed: row.encashmentAllowed,
      minDaysBeforeApply: row.minDaysBeforeApply,
      maxConsecutiveDays: row.maxConsecutiveDays,
      requiresDocument: row.requiresDocument,
      documentRequiredAfterDays: row.documentRequiredAfterDays,
      isPaid: row.isPaid,
      applicableCategories: row.applicableCategories ?? [],
      applicableGrades: row.applicableGrades,
      sortOrder: row.sortOrder,
    });
    setFieldErrors({});
    setFormOpen(true);
  };

  const rows = data ?? [];

  const columns = useMemo<Column<LeaveTypeConfigResponseDTO>[]>(
    () => [
      { key: "leaveCode", header: "Code", searchable: true, className: "font-mono" },
      { key: "displayName", header: "Name", searchable: true },
      { key: "annualQuota", header: "Annual Quota" },
      {
        key: "isPaid",
        header: "Paid",
        render: (row) => (
          <Badge variant={row.isPaid ? "default" : "secondary"}>{row.isPaid ? "Yes" : "No"}</Badge>
        ),
      },
      {
        key: "carryForward",
        header: "Carry Forward",
        render: (row) =>
          row.carryForwardAllowed ? `Yes (max ${row.maxCarryForward})` : "No",
      },
      {
        key: "categories",
        header: "Categories",
        render: (row) => (
          <div className="flex flex-wrap gap-1">
            {(row.applicableCategories ?? []).length > 0 ? (
              row.applicableCategories?.map((category) => (
                <Badge key={category} variant="outline" className="text-[10px]">
                  {category.replace(/_/g, " ")}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">All</span>
            )}
          </div>
        ),
      },
      {
        key: "requiresDocument",
        header: "Document",
        render: (row) =>
          row.requiresDocument
            ? `After ${row.documentRequiredAfterDays ?? 0} days`
            : "No",
      },
      {
        key: "active",
        header: "Status",
        render: (row) => (
          <Badge variant={row.active ? "default" : "secondary"}>{row.active ? "Active" : "Inactive"}</Badge>
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
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Leave Types</h3>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Leave Type
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.uuid}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
        emptyMessage={isLoading ? "Loading leave types..." : "No leave types found."}
      />

      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Leave Type" : "Create Leave Type"}</DialogTitle>
            <DialogDescription>Configure quota, carry-forward, document, and eligibility rules.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lt-code">Leave Code</Label>
                <Input
                  id="lt-code"
                  value={form.leaveCode}
                  onChange={(e) => setForm((p) => ({ ...p, leaveCode: e.target.value.toUpperCase() }))}
                  placeholder="CL, SL, EL..."
                />
                {fieldErrors.leaveCode?.[0] && <p className="text-xs text-destructive">{fieldErrors.leaveCode[0]}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lt-name">Display Name</Label>
                <Input
                  id="lt-name"
                  value={form.displayName}
                  onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                  placeholder="Casual Leave"
                />
                {fieldErrors.displayName?.[0] && <p className="text-xs text-destructive">{fieldErrors.displayName[0]}</p>}
              </div>
            </div>

            {/* Quota */}
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="lt-quota">Annual Quota</Label>
                <Input
                  id="lt-quota"
                  type="number"
                  min={0}
                  value={form.annualQuota}
                  onChange={(e) => setForm((p) => ({ ...p, annualQuota: Number(e.target.value || 0) }))}
                />
                {fieldErrors.annualQuota?.[0] && <p className="text-xs text-destructive">{fieldErrors.annualQuota[0]}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lt-min-advance">Min Days Before Apply</Label>
                <Input
                  id="lt-min-advance"
                  type="number"
                  min={0}
                  value={form.minDaysBeforeApply ?? 0}
                  onChange={(e) => setForm((p) => ({ ...p, minDaysBeforeApply: Number(e.target.value || 0) }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lt-max-consec">Max Consecutive Days</Label>
                <Input
                  id="lt-max-consec"
                  type="number"
                  min={0}
                  value={form.maxConsecutiveDays ?? ""}
                  onChange={(e) => setForm((p) => ({
                    ...p,
                    maxConsecutiveDays: e.target.value ? Number(e.target.value) : undefined,
                  }))}
                  placeholder="No limit"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="lt-paid"
                  checked={form.isPaid ?? true}
                  onCheckedChange={(checked) => setForm((p) => ({ ...p, isPaid: checked }))}
                />
                <Label htmlFor="lt-paid">Paid Leave</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="lt-encash"
                  checked={form.encashmentAllowed ?? false}
                  onCheckedChange={(checked) => setForm((p) => ({ ...p, encashmentAllowed: checked }))}
                />
                <Label htmlFor="lt-encash">Encashment Allowed</Label>
              </div>
            </div>

            {/* Carry forward */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="lt-carry"
                  checked={form.carryForwardAllowed ?? false}
                  onCheckedChange={(checked) => setForm((p) => ({ ...p, carryForwardAllowed: checked }))}
                />
                <Label htmlFor="lt-carry">Carry Forward</Label>
              </div>
              {form.carryForwardAllowed && (
                <div className="grid gap-2">
                  <Label htmlFor="lt-max-carry">Max Carry Forward</Label>
                  <Input
                    id="lt-max-carry"
                    type="number"
                    min={0}
                    value={form.maxCarryForward ?? 0}
                    onChange={(e) => setForm((p) => ({ ...p, maxCarryForward: Number(e.target.value || 0) }))}
                  />
                </div>
              )}
            </div>

            {/* Document Rules */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="lt-doc"
                  checked={form.requiresDocument ?? false}
                  onCheckedChange={(checked) => setForm((p) => ({ ...p, requiresDocument: checked }))}
                />
                <Label htmlFor="lt-doc">Requires Document</Label>
              </div>
              {form.requiresDocument && (
                <div className="grid gap-2">
                  <Label htmlFor="lt-doc-after">After Days</Label>
                  <Input
                    id="lt-doc-after"
                    type="number"
                    min={0}
                    value={form.documentRequiredAfterDays ?? ""}
                    onChange={(e) => setForm((p) => ({
                      ...p,
                      documentRequiredAfterDays: e.target.value ? Number(e.target.value) : undefined,
                    }))}
                  />
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Applicable Categories</Label>
              <div className="grid gap-2 rounded-md border p-3">
                {STAFF_CATEGORY_OPTIONS.map((option) => {
                  const selected = (form.applicableCategories ?? []).includes(option.value);
                  return (
                    <label key={option.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setForm((prev) => {
                            const current = prev.applicableCategories ?? [];
                            return {
                              ...prev,
                              applicableCategories: checked
                                ? [...current, option.value]
                                : current.filter((item) => item !== option.value),
                            };
                          });
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Sort order */}
            <div className="grid gap-2 md:max-w-[200px]">
              <Label htmlFor="lt-sort">Sort Order</Label>
              <Input
                id="lt-sort"
                type="number"
                min={0}
                value={form.sortOrder ?? 0}
                onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value || 0) }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button
              onClick={() => setSaveReviewOpen(true)}
              disabled={saveMutation.isPending || !form.leaveCode || !form.displayName}
            >
              {editing ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReviewDialog
        open={saveReviewOpen}
        onOpenChange={setSaveReviewOpen}
        title={editing ? "Confirm Leave Type Update" : "Confirm Leave Type Creation"}
        description="Review quota and rule settings before saving this leave type."
        severity="warning"
        confirmLabel={editing ? "Save Changes" : "Create Leave Type"}
        isPending={saveMutation.isPending}
        requireCheckbox
        checkboxLabel="I verified leave rules, quota limits, and applicable categories."
        onConfirm={() => saveMutation.mutate(form)}
      >
        <div className="space-y-1 text-sm">
          <p>Code: <span className="font-medium">{form.leaveCode || "-"}</span></p>
          <p>Name: <span className="font-medium">{form.displayName || "-"}</span></p>
          <p>Annual Quota: <span className="font-medium">{form.annualQuota ?? 0}</span></p>
          <p>Paid: <span className="font-medium">{form.isPaid ? "Yes" : "No"}</span></p>
        </div>
      </ReviewDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete leave type?"
        description={`This will remove ${deleteTarget?.displayName ?? "this leave type"} (${deleteTarget?.leaveCode ?? ""}).`}
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.uuid); }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
