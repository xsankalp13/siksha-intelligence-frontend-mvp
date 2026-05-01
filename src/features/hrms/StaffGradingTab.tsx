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
import { Textarea } from "@/components/ui/textarea";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";
import StaffSearchSelect from "@/features/hrms/components/StaffSearchSelect";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { adminService, type StaffSummaryDTO } from "@/services/admin";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type {
  StaffGradeCreateUpdateDTO,
  StaffGradeResponseDTO,
  StaffGradeAssignDTO,
  StaffGradeAssignmentResponseDTO,
  TeachingWing,
} from "@/services/types/hrms";

const WINGS: TeachingWing[] = ["PRIMARY", "SECONDARY", "SENIOR_SECONDARY", "HIGHER_SECONDARY"];

const initialForm: StaffGradeCreateUpdateDTO = {
  gradeCode: "",
  gradeName: "",
  teachingWing: "PRIMARY",
  payBandMin: 0,
  payBandMax: 0,
  sortOrder: 0,
  minYearsForPromotion: undefined,
  description: "",
};

const initialAssignForm: StaffGradeAssignDTO = {
  staffRef: "",
  gradeRef: "",
  effectiveFrom: new Date().toISOString().slice(0, 10),
  promotionOrderRef: "",
  remarks: "",
};

export default function StaffGradingTab() {
  const queryClient = useQueryClient();
  const { formatCurrency, formatDate } = useHrmsFormatters();
  const [formOpen, setFormOpen] = useState(false);
  const [saveReviewOpen, setSaveReviewOpen] = useState(false);
  const [editing, setEditing] = useState<StaffGradeResponseDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffGradeResponseDTO | null>(null);
  const [form, setForm] = useState<StaffGradeCreateUpdateDTO>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Grade assignment
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState<StaffGradeAssignDTO>(initialAssignForm);
  const [assignErrors, setAssignErrors] = useState<Record<string, string[]>>({});
  const [selectedStaffRefs, setSelectedStaffRefs] = useState<string[]>([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [assignReviewPayload, setAssignReviewPayload] = useState<
    (Omit<StaffGradeAssignDTO, "staffRef"> & { staffRefs: string[] }) | null
  >(null);

  // History
  const [historyStaffUuid, setHistoryStaffUuid] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hrms", "grades"],
    queryFn: () => hrmsService.listGrades().then((res) => res.data),
  });

  const historyQuery = useQuery({
    queryKey: ["hrms", "grade-history", historyStaffUuid],
    queryFn: () => hrmsService.getStaffGradeHistory(historyStaffUuid!).then((res) => res.data),
    enabled: Boolean(historyStaffUuid),
  });

  const staffQuery = useQuery({
    queryKey: ["hrms", "staff", "all-active"],
    queryFn: () =>
      adminService
        .listStaff({ page: 0, size: 500, sortBy: "firstName", sortDir: "asc" })
        .then((res) => res.data),
  });

  const assignmentsQuery = useQuery({
    queryKey: ["hrms", "grade-assignments", "current"],
    queryFn: () =>
      hrmsService
        .listGradeAssignments({ page: 0, size: 1000 })
        .then((res) => res.data),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["hrms", "grades"] });

  const saveMutation = useMutation({
    mutationFn: (payload: StaffGradeCreateUpdateDTO) =>
      editing
        ? hrmsService.updateGrade(editing.uuid, payload)
        : hrmsService.createGrade(payload),
    onSuccess: () => {
      toast.success(editing ? "Grade updated" : "Grade created");
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
    mutationFn: (id: string) => hrmsService.deleteGrade(id),
    onSuccess: () => {
      toast.success("Grade deleted");
      setDeleteTarget(null);
      refresh();
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const assignMutation = useMutation({
    mutationFn: async (payload: Omit<StaffGradeAssignDTO, "staffRef"> & { staffRefs: string[] }) => {
      const results = await Promise.allSettled(
        payload.staffRefs.map((staffRef) =>
          hrmsService.assignGrade({
            staffRef,
            gradeRef: payload.gradeRef,
            effectiveFrom: payload.effectiveFrom,
            promotionOrderRef: payload.promotionOrderRef,
            remarks: payload.remarks,
          }),
        ),
      );

      const failed = results.filter((result) => result.status === "rejected").length;
      return {
        total: payload.staffRefs.length,
        success: payload.staffRefs.length - failed,
        failed,
      };
    },
    onSuccess: (result) => {
      if (result.failed > 0) {
        toast.warning(`Assigned ${result.success} of ${result.total}. ${result.failed} failed.`);
      } else {
        toast.success(`Grade assigned to ${result.success} staff member${result.success === 1 ? "" : "s"}`);
      }
      closeAssignDialog();
      refresh();
      queryClient.invalidateQueries({ queryKey: ["hrms", "grade-assignments"] });
    },
    onError: (err) => {
      const normalized = normalizeHrmsError(err);
      setAssignErrors(normalized.fieldErrors ?? {});
      toast.error(normalized.message);
    },
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

  const closeAssignDialog = () => {
    setAssignOpen(false);
    setAssignForm(initialAssignForm);
    setAssignErrors({});
    setSelectedStaffRefs([]);
    setStaffSearch("");
    setAssignReviewPayload(null);
  };

  const openEdit = (row: StaffGradeResponseDTO) => {
    setEditing(row);
    setForm({
      gradeCode: row.gradeCode,
      gradeName: row.gradeName,
      teachingWing: row.teachingWing,
      payBandMin: row.payBandMin,
      payBandMax: row.payBandMax,
      sortOrder: row.sortOrder,
      minYearsForPromotion: row.minYearsForPromotion,
      description: row.description ?? "",
    });
    setFieldErrors({});
    setFormOpen(true);
  };

  const rows = data ?? [];

  const assignedStaffIds = useMemo(() => {
    const assignments = assignmentsQuery.data?.content ?? [];
    return new Set(
      assignments
        .filter((assignment) => !assignment.effectiveTo)
        .map((assignment) => assignment.staffId),
    );
  }, [assignmentsQuery.data]);

  const unassignedStaff = useMemo(() => {
    const allStaff = (staffQuery.data?.content ?? []) as StaffSummaryDTO[];
    return allStaff.filter((staff) => staff.active && !assignedStaffIds.has(staff.staffId));
  }, [staffQuery.data, assignedStaffIds]);

  const filteredUnassignedStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return unassignedStaff;
    return unassignedStaff.filter((staff) => {
      const fullName = `${staff.firstName} ${staff.middleName ?? ""} ${staff.lastName}`.replace(/\s+/g, " ").trim();
      return (
        fullName.toLowerCase().includes(q) ||
        staff.employeeId.toLowerCase().includes(q) ||
        String(staff.staffId).includes(q) ||
        (staff.jobTitle || "").toLowerCase().includes(q)
      );
    });
  }, [unassignedStaff, staffSearch]);

  const allVisibleSelected =
    filteredUnassignedStaff.length > 0 &&
    filteredUnassignedStaff.every((staff) => selectedStaffRefs.includes(staff.uuid));

  const toggleStaffSelection = (staffRef: string) => {
    setSelectedStaffRefs((prev) =>
      prev.includes(staffRef) ? prev.filter((id) => id !== staffRef) : [...prev, staffRef],
    );
    setAssignErrors((prev) => {
      if (!prev.staffRefs && !prev.staffRef) return prev;
      return { ...prev, staffRefs: [], staffRef: [] };
    });
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleRefs = new Set(filteredUnassignedStaff.map((staff) => staff.uuid));
      setSelectedStaffRefs((prev) => prev.filter((id) => !visibleRefs.has(id)));
      return;
    }

    setSelectedStaffRefs((prev) => {
      const merged = new Set(prev);
      filteredUnassignedStaff.forEach((staff) => merged.add(staff.uuid));
      return Array.from(merged);
    });
  };

  const columns = useMemo<Column<StaffGradeResponseDTO>[]>(
    () => [
      { key: "gradeCode", header: "Code", searchable: true, className: "font-mono" },
      { key: "gradeName", header: "Name", searchable: true },
      {
        key: "teachingWing",
        header: "Teaching Wing",
        render: (row) => (
          <Badge variant="outline">{row.teachingWing.replace(/_/g, " ")}</Badge>
        ),
      },
      {
        key: "payBand",
        header: "Pay Band",
        render: (row) => `${formatCurrency(row.payBandMin)} – ${formatCurrency(row.payBandMax)}`,
      },
      { key: "sortOrder", header: "Sort", render: (row) => row.sortOrder },
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
    [formatCurrency],
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
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              🏆
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Staff Grades</h2>
              <p className="text-sm text-white/70">Seniority tiers, teaching wings, pay bands & promotions</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm gap-1.5"
              onClick={() => setAssignOpen(true)}
            >
              🏅 Assign Grade
            </Button>
            <Button
              size="sm"
              className="bg-white text-amber-700 hover:bg-white/90 font-semibold gap-1.5"
              onClick={openCreate}
            >
              ➕ Add Grade
            </Button>
          </div>
        </div>
      </div>

      {/* Grade History section + table */}
      <div className="space-y-4">

        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.uuid}
          onEdit={openEdit}
          onDelete={(row) => setDeleteTarget(row)}
          emptyMessage={isLoading ? "Loading grades..." : "No grades found."}
        />
      </div>

      {/* Grade History Lookup */}
      <div className="space-y-3 rounded-lg border p-4">
        <h4 className="text-sm font-semibold">Grade History Lookup</h4>
        <div className="flex items-end gap-3">
          <div className="min-w-[320px]">
            <StaffSearchSelect
              label="Staff Member"
              value={historyStaffUuid}
              onChange={(uuid) => setHistoryStaffUuid(uuid)}
              placeholder="Select staff to view grade history..."
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!historyStaffUuid}
            onClick={() => historyQuery.refetch()}
          >
            View History
          </Button>
        </div>
        {historyQuery.data && (
          <div className="space-y-1 text-sm">
            {(historyQuery.data as StaffGradeAssignmentResponseDTO[]).length === 0 ? (
              <p className="text-muted-foreground">No grade history found.</p>
            ) : (
              (historyQuery.data as StaffGradeAssignmentResponseDTO[]).map((h) => (
                <div key={h.assignmentId} className="flex items-center justify-between rounded border px-3 py-2">
                  <span>
                    <span className="font-mono font-semibold">{h.gradeCode}</span> {h.gradeName}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDate(h.effectiveFrom)} → {h.effectiveTo ? formatDate(h.effectiveTo) : "Present"}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Grade Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Grade" : "Create Grade"}</DialogTitle>
            <DialogDescription>
              Grades define seniority tiers (PRT → TGT → PGT → HOD → VP → Principal) with teaching wings and pay bands.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="grade-code">Code</Label>
                <Input
                  id="grade-code"
                  value={form.gradeCode}
                  onChange={(e) => setForm((p) => ({ ...p, gradeCode: e.target.value.toUpperCase() }))}
                  placeholder="PRT, TGT, PGT..."
                />
                {fieldErrors.gradeCode?.[0] && <p className="text-xs text-destructive">{fieldErrors.gradeCode[0]}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="grade-name">Name</Label>
                <Input
                  id="grade-name"
                  value={form.gradeName}
                  onChange={(e) => setForm((p) => ({ ...p, gradeName: e.target.value }))}
                  placeholder="Primary Teacher"
                />
                {fieldErrors.gradeName?.[0] && <p className="text-xs text-destructive">{fieldErrors.gradeName[0]}</p>}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Teaching Wing</Label>
              <Select
                value={form.teachingWing}
                onValueChange={(v) => setForm((p) => ({ ...p, teachingWing: v as TeachingWing }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WINGS.map((w) => (
                    <SelectItem key={w} value={w}>{w.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="grade-pay-min">Pay Band Min</Label>
                <Input
                  id="grade-pay-min"
                  type="number"
                  min={0}
                  value={form.payBandMin}
                  onChange={(e) => setForm((p) => ({ ...p, payBandMin: Number(e.target.value || 0) }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="grade-pay-max">Pay Band Max</Label>
                <Input
                  id="grade-pay-max"
                  type="number"
                  min={0}
                  value={form.payBandMax}
                  onChange={(e) => setForm((p) => ({ ...p, payBandMax: Number(e.target.value || 0) }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="grade-sort">Sort Order</Label>
                <Input
                  id="grade-sort"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value || 0) }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="grade-promo-years">Min Years for Promotion</Label>
                <Input
                  id="grade-promo-years"
                  type="number"
                  min={0}
                  value={form.minYearsForPromotion ?? ""}
                  onChange={(e) => setForm((p) => ({
                    ...p,
                    minYearsForPromotion: e.target.value ? Number(e.target.value) : undefined,
                  }))}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="grade-desc">Description</Label>
              <Textarea
                id="grade-desc"
                value={form.description ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button
              disabled={saveMutation.isPending || !form.gradeCode || !form.gradeName}
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
        title={editing ? "Confirm Grade Update" : "Confirm Grade Creation"}
        description="Review grade configuration before saving."
        severity="warning"
        confirmLabel={editing ? "Save Changes" : "Create Grade"}
        isPending={saveMutation.isPending}
        requireCheckbox
        checkboxLabel="I verified grade code, wing, and pay band values."
        onConfirm={() => saveMutation.mutate(form)}
      >
        <div className="space-y-1 text-sm">
          <p>Code: <span className="font-medium">{form.gradeCode || "-"}</span></p>
          <p>Name: <span className="font-medium">{form.gradeName || "-"}</span></p>
          <p>Wing: <span className="font-medium">{form.teachingWing}</span></p>
          <p>Band: <span className="font-medium">{formatCurrency(form.payBandMin)} - {formatCurrency(form.payBandMax)}</span></p>
        </div>
      </ReviewDialog>

      {/* Assign Grade Dialog */}
      <Dialog open={assignOpen} onOpenChange={(open) => { if (!open) closeAssignDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Grade to Staff</DialogTitle>
            <DialogDescription>Select one or more unassigned staff and map them to a seniority grade.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="assign-staff-search">Unassigned Staff</Label>
              <Input
                id="assign-staff-search"
                placeholder="Search by name, staff ID, employee ID, or job title"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {selectedStaffRefs.length} selected • {unassignedStaff.length} unassigned total
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={toggleSelectAllVisible}
                  disabled={filteredUnassignedStaff.length === 0}
                >
                  {allVisibleSelected ? "Clear visible" : "Select visible"}
                </Button>
              </div>
              <div className="max-h-44 overflow-y-auto rounded-md border">
                {staffQuery.isLoading || assignmentsQuery.isLoading ? (
                  <p className="p-3 text-sm text-muted-foreground">Loading staff list...</p>
                ) : filteredUnassignedStaff.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No unassigned staff found.</p>
                ) : (
                  filteredUnassignedStaff.map((staff) => {
                    const fullName = `${staff.firstName} ${staff.middleName ?? ""} ${staff.lastName}`.replace(/\s+/g, " ").trim();
                    const checked = selectedStaffRefs.includes(staff.uuid);
                    return (
                      <label
                        key={staff.staffId}
                        className="flex cursor-pointer items-start gap-2 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-muted/40"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={checked}
                          onChange={() => toggleStaffSelection(staff.uuid)}
                        />
                        <span className="min-w-0">
                          <span className="block font-medium">{fullName}</span>
                          <span className="block text-xs text-muted-foreground">
                            ID: {staff.staffId} • Emp: {staff.employeeId} • {staff.jobTitle || "Staff"}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              {assignErrors.staffRefs?.[0] && <p className="text-xs text-destructive">{assignErrors.staffRefs[0]}</p>}
              {assignErrors.staffRef?.[0] && <p className="text-xs text-destructive">{assignErrors.staffRef[0]}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Grade</Label>
              <Select
                value={assignForm.gradeRef || undefined}
                onValueChange={(v) => setAssignForm((p) => ({ ...p, gradeRef: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  {rows.map((g) => (
                    <SelectItem key={g.gradeId} value={g.uuid}>
                      {g.gradeCode} — {g.gradeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assign-effective">Effective From</Label>
              <Input
                id="assign-effective"
                type="date"
                value={assignForm.effectiveFrom}
                onChange={(e) => setAssignForm((p) => ({ ...p, effectiveFrom: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assign-remarks">Remarks</Label>
              <Textarea
                id="assign-remarks"
                value={assignForm.remarks ?? ""}
                onChange={(e) => setAssignForm((p) => ({ ...p, remarks: e.target.value }))}
                placeholder="Promotion/transfer reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAssignDialog}>Cancel</Button>
            <Button
              disabled={assignMutation.isPending || selectedStaffRefs.length === 0 || !assignForm.gradeRef}
              onClick={() => {
                if (selectedStaffRefs.length === 0) {
                  setAssignErrors({ staffRefs: ["Select at least one staff member"] });
                  return;
                }
                setAssignReviewPayload({
                  staffRefs: selectedStaffRefs,
                  gradeRef: assignForm.gradeRef,
                  effectiveFrom: assignForm.effectiveFrom,
                  promotionOrderRef: assignForm.promotionOrderRef,
                  remarks: assignForm.remarks,
                });
              }}
            >
              Assign ({selectedStaffRefs.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReviewDialog
        open={Boolean(assignReviewPayload)}
        onOpenChange={(open) => {
          if (!open) setAssignReviewPayload(null);
        }}
        title="Confirm Grade Assignment"
        description="This will assign the selected grade to all selected staff."
        severity="warning"
        confirmLabel="Assign Grade"
        isPending={assignMutation.isPending}
        requireCheckbox
        checkboxLabel="I verified selected staff and effective date for this bulk assignment."
        onConfirm={() => {
          if (!assignReviewPayload) return;
          assignMutation.mutate(assignReviewPayload);
        }}
      >
        <div className="space-y-1 text-sm">
          <p>
            Staff Selected: <span className="font-medium">{assignReviewPayload?.staffRefs.length ?? 0}</span>
          </p>
          <p>
            Effective From: <span className="font-medium">{assignReviewPayload?.effectiveFrom ?? "-"}</span>
          </p>
          <p>
            Remarks: <span className="font-medium">{assignReviewPayload?.remarks?.trim() || "-"}</span>
          </p>
        </div>
      </ReviewDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete staff grade?"
        description={`This will remove ${deleteTarget?.gradeName ?? "this grade"} (${deleteTarget?.gradeCode ?? ""}).`}
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.uuid); }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
