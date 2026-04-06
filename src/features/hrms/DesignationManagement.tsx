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
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import { useAppSelector } from "@/store/hooks";
import type {
  StaffCategory,
  StaffDesignationCreateUpdateDTO,
  StaffDesignationResponseDTO,
} from "@/services/types/hrms";

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
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Designation Management</h3>
        <div className="flex items-center gap-2">
          <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as "ALL" | StaffCategory)}>
            <SelectTrigger className="w-[220px]">
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

          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Designation
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.uuid}
        onEdit={openEdit}
        onDelete={(row) => setDeleteTarget(row)}
        emptyMessage={isLoading ? "Loading designations..." : "No designations found."}
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
    </div>
  );
}
