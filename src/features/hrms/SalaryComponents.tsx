import { useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type {
  CalculationMethod,
  SalaryComponentCreateUpdateDTO,
  SalaryComponentResponseDTO,
  SalaryComponentType,
} from "@/services/types/hrms";

const COMP_TYPES: SalaryComponentType[] = ["EARNING", "DEDUCTION"];
const CALC_METHODS: CalculationMethod[] = ["FIXED", "PERCENTAGE_OF_BASIC", "PERCENTAGE_OF_GROSS"];

const initialForm: SalaryComponentCreateUpdateDTO = {
  componentCode: "",
  componentName: "",
  type: "EARNING",
  calculationMethod: "FIXED",
  defaultValue: 0,
  isTaxable: false,
  isStatutory: false,
  sortOrder: 0,
};

export default function SalaryComponents() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [saveReviewOpen, setSaveReviewOpen] = useState(false);
  const [editing, setEditing] = useState<SalaryComponentResponseDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SalaryComponentResponseDTO | null>(null);
  const [form, setForm] = useState<SalaryComponentCreateUpdateDTO>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hrms", "salary", "components"],
    queryFn: () => hrmsService.listSalaryComponents().then((res) => res.data),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["hrms", "salary", "components"] });

  const saveMutation = useMutation({
    mutationFn: (payload: SalaryComponentCreateUpdateDTO) =>
      editing
        ? hrmsService.updateSalaryComponent(editing.uuid, payload)
        : hrmsService.createSalaryComponent(payload),
    onSuccess: () => {
      toast.success(editing ? "Component updated" : "Component created");
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
    mutationFn: (id: string) => hrmsService.deleteSalaryComponent(id),
    onSuccess: () => {
      toast.success("Component deleted");
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

  const openEdit = (row: SalaryComponentResponseDTO) => {
    setEditing(row);
    setForm({
      componentCode: row.componentCode,
      componentName: row.componentName,
      type: row.type,
      calculationMethod: row.calculationMethod,
      defaultValue: row.defaultValue,
      isTaxable: row.isTaxable,
      isStatutory: row.isStatutory,
      sortOrder: row.sortOrder,
    });
    setFieldErrors({});
    setFormOpen(true);
  };

  const rows = data ?? [];

  const columns = useMemo<Column<SalaryComponentResponseDTO>[]>(
    () => [
      { key: "componentCode", header: "Code", searchable: true, className: "font-mono" },
      { key: "componentName", header: "Name", searchable: true },
      {
        key: "type",
        header: "Type",
        render: (row) => (
          <Badge variant={row.type === "EARNING" ? "default" : "secondary"}>{row.type}</Badge>
        ),
      },
      {
        key: "calculationMethod",
        header: "Calc Method",
        render: (row) => row.calculationMethod.replace(/_/g, " "),
      },
      { key: "defaultValue", header: "Default", render: (row) => row.defaultValue },
      {
        key: "flags",
        header: "Flags",
        render: (row) => (
          <div className="flex gap-1">
            {row.isTaxable && <Badge variant="outline">Taxable</Badge>}
            {row.isStatutory && <Badge variant="outline">🏛️ Statutory</Badge>}
          </div>
        ),
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
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-600 via-sky-600 to-blue-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              💰
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Salary Components</h2>
              <p className="text-sm text-white/70">Define earnings & deductions that build salary templates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-medium">
              <span className="text-emerald-300">⬆️ Earnings</span>
              <span className="text-white/40">/</span>
              <span className="text-rose-300">⬇️ Deductions</span>
            </div>
            <Button
              onClick={() => { setEditing(null); setForm(initialForm); setFieldErrors({}); setFormOpen(true); }}
              className="bg-white text-cyan-700 hover:bg-white/90 font-semibold gap-1.5 shadow-sm"
            >
              ➕ Add Component
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
        emptyMessage={isLoading ? "Loading salary components..." : "No salary components found."}
      />

      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Component" : "Create Component"}</DialogTitle>
            <DialogDescription>Components are building blocks for salary templates (earnings + deductions).</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="comp-code">Code</Label>
                <Input id="comp-code" value={form.componentCode} onChange={(e) => setForm((p) => ({ ...p, componentCode: e.target.value.toUpperCase() }))} placeholder="BASIC, HRA, PF_EMP..." />
                {fieldErrors.componentCode?.[0] && <p className="text-xs text-destructive">{fieldErrors.componentCode[0]}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="comp-name">Name</Label>
                <Input id="comp-name" value={form.componentName} onChange={(e) => setForm((p) => ({ ...p, componentName: e.target.value }))} />
                {fieldErrors.componentName?.[0] && <p className="text-xs text-destructive">{fieldErrors.componentName[0]}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as SalaryComponentType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Calculation Method</Label>
                <Select value={form.calculationMethod} onValueChange={(v) => setForm((p) => ({ ...p, calculationMethod: v as CalculationMethod }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CALC_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="comp-default">Default Value</Label>
                <Input id="comp-default" type="number" min={0} value={form.defaultValue} onChange={(e) => setForm((p) => ({ ...p, defaultValue: Number(e.target.value || 0) }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="comp-sort">Sort Order</Label>
                <Input id="comp-sort" type="number" min={0} value={form.sortOrder ?? 0} onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value || 0) }))} />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch id="comp-tax" checked={form.isTaxable ?? false} onCheckedChange={(v) => setForm((p) => ({ ...p, isTaxable: v }))} />
                <Label htmlFor="comp-tax">Taxable</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="comp-stat" checked={form.isStatutory ?? false} onCheckedChange={(v) => setForm((p) => ({ ...p, isStatutory: v }))} />
                <Label htmlFor="comp-stat">Statutory (PF/ESI/TDS)</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button disabled={saveMutation.isPending || !form.componentCode || !form.componentName} onClick={() => setSaveReviewOpen(true)}>
              {editing ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReviewDialog
        open={saveReviewOpen}
        onOpenChange={setSaveReviewOpen}
        title={editing ? "Confirm Component Update" : "Confirm Component Creation"}
        description="Review salary component details before saving."
        severity="warning"
        confirmLabel={editing ? "Save Changes" : "Create Component"}
        isPending={saveMutation.isPending}
        requireCheckbox
        checkboxLabel="I verified type, method, and default value for this component."
        onConfirm={() => saveMutation.mutate(form)}
      >
        <div className="space-y-1 text-sm">
          <p>Code: <span className="font-medium">{form.componentCode || "-"}</span></p>
          <p>Name: <span className="font-medium">{form.componentName || "-"}</span></p>
          <p>Type: <span className="font-medium">{form.type}</span></p>
          <p>Method: <span className="font-medium">{form.calculationMethod}</span></p>
        </div>
      </ReviewDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete salary component?"
        description={`This will remove ${deleteTarget?.componentName ?? "this component"} (${deleteTarget?.componentCode ?? ""}).`}
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.uuid); }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
