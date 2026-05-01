import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { shiftService } from "@/services/shiftService";
import { hrmsService } from "@/services/hrms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getLocalDateString } from "@/lib/dateUtils";
import type { ShiftCreateDTO, ShiftResponseDTO } from "@/services/types/shift";
import {
  Clock,
  
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Pencil,
  SquarePen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type ShiftDialogMode = "create" | "edit";

type ConfirmAction =
  | { type: "create-shift" }
  | { type: "update-shift"; shiftUuid: string }
  | { type: "delete-shift"; shiftUuid: string; shiftName: string }
  | { type: "map-single" }
  | { type: "map-bulk"; count: number }
  | { type: "remove-mapping"; mappingUuid: string; staffName: string; shiftName: string };

const DEFAULT_SHIFT_FORM: ShiftCreateDTO = {
  shiftName: "",
  startTime: "09:00:00",
  endTime: "17:00:00",
  graceMinutes: 10,
  applicableDays: [1, 2, 3, 4, 5],
  isDefault: false,
};

function getErrorMessage(error: unknown, fallback: string) {
  const msg = error as { response?: { data?: { message?: string } | string }; message?: string };
  const serverMessage =
    typeof msg?.response?.data === "string"
      ? msg.response.data
      : msg?.response?.data?.message;
  return serverMessage ?? msg?.message ?? fallback;
}

export default function ShiftManagement() {
  const qc = useQueryClient();

  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [shiftDialogMode, setShiftDialogMode] = useState<ShiftDialogMode>("create");
  const [editingShiftUuid, setEditingShiftUuid] = useState<string | null>(null);
  const [shiftForm, setShiftForm] = useState<ShiftCreateDTO>(DEFAULT_SHIFT_FORM);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [mappingEditMode, setMappingEditMode] = useState(false);
  const [mappingPage, setMappingPage] = useState(0);
  const mappingPageSize = 9;

  // ── Single map form ────────────────────────────────────────
  const [mapForm, setMapForm] = useState({
    staffUuid: "",
    shiftUuid: "",
    effectiveFrom: getLocalDateString(),
  });

  // ── Bulk map state ─────────────────────────────────────────
  const [bulkShiftUuid, setBulkShiftUuid] = useState("");
  const [bulkEffectiveFrom, setBulkEffectiveFrom] = useState(getLocalDateString());
  const [selectedStaffUuids, setSelectedStaffUuids] = useState<Set<string>>(new Set());
  const [bulkSearch, setBulkSearch] = useState("");
  const [mappingMode, setMappingMode] = useState<"single" | "bulk">("single");

  // ── Queries ────────────────────────────────────────────────
  const { data: shifts } = useQuery({
    queryKey: ["ams", "shifts"],
    queryFn: () => shiftService.listShifts().then((r) => r.data),
  });

  const { data: staff } = useQuery({
    queryKey: ["hrms", "staff", "dropdown"],
    queryFn: () => hrmsService.listStaffForDropdown().then((r) => r.data.content),
  });

  const { data: mappings } = useQuery({
    queryKey: ["ams", "shift-mappings", mappingPage, mappingPageSize],
    queryFn: () =>
      shiftService
        .listShiftMappings({ page: mappingPage, size: mappingPageSize, sort: "effectiveFrom,desc" })
        .then((r) => r.data),
  });

  // ── Mutations ──────────────────────────────────────────────
  const createShift = useMutation({
    mutationFn: (payload: ShiftCreateDTO) => shiftService.createShift(payload),
    onSuccess: () => {
      toast.success("Shift created");
      qc.invalidateQueries({ queryKey: ["ams", "shifts"] });
      setShiftDialogOpen(false);
      setShiftForm(DEFAULT_SHIFT_FORM);
      setConfirmAction(null);
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to create shift")),
  });

  const updateShift = useMutation({
    mutationFn: (payload: { shiftUuid: string; data: ShiftCreateDTO }) =>
      shiftService.updateShift(payload.shiftUuid, payload.data),
    onSuccess: () => {
      toast.success("Shift updated");
      qc.invalidateQueries({ queryKey: ["ams", "shifts"] });
      qc.invalidateQueries({ queryKey: ["ams", "shift-mappings"] });
      setShiftDialogOpen(false);
      setEditingShiftUuid(null);
      setConfirmAction(null);
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to update shift")),
  });

  const deleteShift = useMutation({
    mutationFn: (shiftUuid: string) => shiftService.deleteShift(shiftUuid),
    onSuccess: () => {
      toast.success("Shift removed");
      qc.invalidateQueries({ queryKey: ["ams", "shifts"] });
      qc.invalidateQueries({ queryKey: ["ams", "shift-mappings"] });
      setConfirmAction(null);
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to remove shift")),
  });

  const mapSingle = useMutation({
    mutationFn: () => shiftService.mapStaffToShift(mapForm),
    onSuccess: () => {
      toast.success("Staff mapped to shift");
      qc.invalidateQueries({ queryKey: ["ams", "shift-mappings"] });
      setConfirmAction(null);
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to map staff")),
  });

  const mapBulk = useMutation({
    mutationFn: () =>
      shiftService.bulkMapStaffToShift({
        staffUuids: Array.from(selectedStaffUuids),
        shiftUuid: bulkShiftUuid,
        effectiveFrom: bulkEffectiveFrom,
      }),
    onSuccess: (res) => {
      const result = res.data;
      if (result.failed > 0) {
        toast.warning(`${result.success} mapped, ${result.failed} failed`);
      } else {
        toast.success(`${result.success} staff mapped successfully`);
      }
      qc.invalidateQueries({ queryKey: ["ams", "shift-mappings"] });
      setSelectedStaffUuids(new Set());
      setConfirmAction(null);
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Bulk mapping failed")),
  });

  const removeMapping = useMutation({
    mutationFn: (mappingUuid: string) => shiftService.removeShiftMapping(mappingUuid),
    onSuccess: () => {
      toast.success("Mapping removed");
      qc.invalidateQueries({ queryKey: ["ams", "shift-mappings"] });
      setConfirmAction(null);
      if ((mappings?.content?.length ?? 0) === 1 && mappingPage > 0) {
        setMappingPage((prev) => prev - 1);
      }
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Failed to remove mapping")),
  });

  const activeShifts = useMemo(() => shifts ?? [], [shifts]);
  const allStaff = useMemo(() => staff ?? [], [staff]);
  const mappingRows = mappings?.content ?? [];
  const mappingTotalPages = mappings?.totalPages ?? 0;
  const mappingTotalElements = mappings?.totalElements ?? 0;

  // Filter staff for bulk selection
  const filteredStaff = useMemo(() => {
    if (!bulkSearch.trim()) return allStaff;
    const t = bulkSearch.toLowerCase();
    return allStaff.filter(
      (s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(t) ||
        s.employeeId?.toLowerCase().includes(t)
    );
  }, [allStaff, bulkSearch]);

  const toggleStaff = (uuid: string) => {
    setSelectedStaffUuids((prev) => {
      const next = new Set(prev);
      next.has(uuid) ? next.delete(uuid) : next.add(uuid);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedStaffUuids(new Set(filteredStaff.map((s) => s.uuid)));
  };

  const deselectAll = () => {
    setSelectedStaffUuids(new Set());
  };

  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const openCreateShiftDialog = () => {
    setShiftDialogMode("create");
    setEditingShiftUuid(null);
    setShiftForm(DEFAULT_SHIFT_FORM);
    setShiftDialogOpen(true);
  };

  const openEditShiftDialog = (shift: ShiftResponseDTO) => {
    setShiftDialogMode("edit");
    setEditingShiftUuid(shift.uuid);
    setShiftForm({
      shiftName: shift.shiftName,
      startTime: shift.startTime,
      endTime: shift.endTime,
      graceMinutes: shift.graceMinutes,
      applicableDays: shift.applicableDays,
      isDefault: shift.isDefault,
    });
    setShiftDialogOpen(true);
  };

  const getConfirmMeta = (action: ConfirmAction | null) => {
    if (!action) {
      return {
        title: "Confirm",
        description: "Please confirm this action.",
        confirmLabel: "Confirm",
        destructive: false,
      };
    }

    switch (action.type) {
      case "create-shift":
        return {
          title: "Create Shift",
          description: `Create shift \"${shiftForm.shiftName}\" with selected timings and days?`,
          confirmLabel: "Create",
          destructive: false,
        };
      case "update-shift":
        return {
          title: "Update Shift",
          description: "Apply these shift changes? This will impact future mappings.",
          confirmLabel: "Update",
          destructive: false,
        };
      case "delete-shift":
        return {
          title: "Delete Shift",
          description: `Delete shift \"${action.shiftName}\"? Existing mappings may become invalid.`,
          confirmLabel: "Delete",
          destructive: true,
        };
      case "map-single":
        return {
          title: "Confirm Mapping",
          description: "Map the selected staff to the selected shift?",
          confirmLabel: "Map",
          destructive: false,
        };
      case "map-bulk":
        return {
          title: "Confirm Bulk Mapping",
          description: `Map ${action.count} staff member(s) to the selected shift?`,
          confirmLabel: "Map All",
          destructive: false,
        };
      case "remove-mapping":
        return {
          title: "Remove Staff Mapping",
          description: `Remove ${action.staffName} from shift \"${action.shiftName}\"?`,
          confirmLabel: "Remove",
          destructive: true,
        };
      default:
        return {
          title: "Confirm",
          description: "Please confirm this action.",
          confirmLabel: "Confirm",
          destructive: false,
        };
    }
  };

  const confirmMeta = getConfirmMeta(confirmAction);

  const confirmLoading =
    createShift.isPending ||
    updateShift.isPending ||
    deleteShift.isPending ||
    mapSingle.isPending ||
    mapBulk.isPending ||
    removeMapping.isPending;

  const onConfirmAction = () => {
    if (!confirmAction) return;

    switch (confirmAction.type) {
      case "create-shift":
        createShift.mutate(shiftForm);
        return;
      case "update-shift":
        updateShift.mutate({ shiftUuid: confirmAction.shiftUuid, data: shiftForm });
        return;
      case "delete-shift":
        deleteShift.mutate(confirmAction.shiftUuid);
        return;
      case "map-single":
        mapSingle.mutate();
        return;
      case "map-bulk":
        mapBulk.mutate();
        return;
      case "remove-mapping":
        removeMapping.mutate(confirmAction.mappingUuid);
        return;
      default:
        return;
    }
  };

  const renderShiftForm = () => (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-semibold">Shift Name</Label>
          <Input
            placeholder="e.g. Morning Shift"
            value={shiftForm.shiftName}
            onChange={(e) => setShiftForm((p) => ({ ...p, shiftName: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Start Time</Label>
          <Input
            type="time"
            value={shiftForm.startTime.slice(0, 5)}
            onChange={(e) => setShiftForm((p) => ({ ...p, startTime: `${e.target.value}:00` }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">End Time</Label>
          <Input
            type="time"
            value={shiftForm.endTime.slice(0, 5)}
            onChange={(e) => setShiftForm((p) => ({ ...p, endTime: `${e.target.value}:00` }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Grace (min)</Label>
          <Input
            type="number"
            min={0}
            value={shiftForm.graceMinutes}
            onChange={(e) => setShiftForm((p) => ({ ...p, graceMinutes: Number(e.target.value || 0) }))}
          />
        </div>
        <div className="flex items-end">
          <label className="inline-flex items-center gap-2 text-sm">
            <Checkbox
              checked={shiftForm.isDefault}
              onCheckedChange={(v) => setShiftForm((p) => ({ ...p, isDefault: Boolean(v) }))}
            />
            Default Shift
          </label>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Applicable Days</Label>
        <div className="flex flex-wrap gap-2">
          {DAY_LABELS.map((label, i) => {
            const dayNum = i + 1;
            const isActive = shiftForm.applicableDays.includes(dayNum);
            return (
              <button
                key={dayNum}
                type="button"
                onClick={() =>
                  setShiftForm((p) => ({
                    ...p,
                    applicableDays: isActive
                      ? p.applicableDays.filter((d) => d !== dayNum)
                      : [...p.applicableDays, dayNum],
                  }))
                }
                className={`h-9 w-11 rounded-lg text-xs font-semibold border transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Unified Hero Header ──────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 px-5 py-5 sm:px-6 text-white shadow-lg">
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white" />
          <div className="absolute -bottom-20 left-0 h-44 w-44 rounded-full bg-white" />
        </div>
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm text-2xl shadow-inner">
            ⏰
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg sm:text-xl font-bold tracking-tight text-white">Shift Management</h2>
            <p className="text-xs sm:text-sm text-white/75">
              Define shifts, working hours, grace periods and assign staff to schedules
            </p>
          </div>
        </div>
      </div>

      {/* ── Shift Definitions ───────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg">⏰ Shift Definitions</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Configure working hours and grace periods</p>
              </div>
            </div>

            <Button
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md"
              onClick={openCreateShiftDialog}
            >
              ⏰ Create Shift
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing shifts */}
          {activeShifts.length > 0 && (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 pt-2">
              {activeShifts.map((s) => (
                <div
                  key={s.uuid}
                  className="group rounded-xl border border-border bg-muted/20 p-3"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{s.shiftName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.startTime?.slice(0, 5)} – {s.endTime?.slice(0, 5)} • Grace: {s.graceMinutes}m
                      </p>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditShiftDialog(s)}
                        title="Edit shift"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() =>
                          setConfirmAction({
                            type: "delete-shift",
                            shiftUuid: s.uuid,
                            shiftName: s.shiftName,
                          })
                        }
                        title="Delete shift"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {s.isDefault && (
                    <Badge variant="secondary" className="text-[10px]">Default</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Staff Shift Mapping ──────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400" />
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
                <UserPlus className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Staff Shift Mapping</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Assign shifts to individual or multiple staff</p>
              </div>
            </div>

            {/* Mode toggle */}
            <div className="flex bg-muted rounded-lg p-0.5">
              <button
                onClick={() => setMappingMode("single")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  mappingMode === "single"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Single
              </button>
              <button
                onClick={() => setMappingMode("bulk")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  mappingMode === "bulk"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users className="h-3.5 w-3.5" /> Bulk
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {mappingMode === "single" ? (
            /* ── Single mapping ───────────────────── */
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Staff</Label>
                <Select value={mapForm.staffUuid} onValueChange={(v) => setMapForm((p) => ({ ...p, staffUuid: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select staff..." /></SelectTrigger>
                  <SelectContent>
                    {allStaff.map((s) => (
                      <SelectItem key={s.uuid} value={s.uuid}>
                        {s.firstName} {s.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Shift</Label>
                <Select value={mapForm.shiftUuid} onValueChange={(v) => setMapForm((p) => ({ ...p, shiftUuid: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select shift..." /></SelectTrigger>
                  <SelectContent>
                    {activeShifts.map((s) => (
                      <SelectItem key={s.uuid} value={s.uuid}>{s.shiftName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Effective From</Label>
                <Input
                  type="date"
                  value={mapForm.effectiveFrom}
                  onChange={(e) => setMapForm((p) => ({ ...p, effectiveFrom: e.target.value }))}
                />
              </div>
              <div className="flex items-end">
                <Button
                    onClick={() => setConfirmAction({ type: "map-single" })}
                  disabled={!mapForm.shiftUuid || !mapForm.staffUuid || mapSingle.isPending}
                  className="w-full gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Map
                </Button>
              </div>
            </div>
          ) : (
            /* ── Bulk mapping ─────────────────────── */
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Shift to Assign</Label>
                  <Select value={bulkShiftUuid} onValueChange={setBulkShiftUuid}>
                    <SelectTrigger><SelectValue placeholder="Select shift..." /></SelectTrigger>
                    <SelectContent>
                      {activeShifts.map((s) => (
                        <SelectItem key={s.uuid} value={s.uuid}>
                          {s.shiftName} ({s.startTime?.slice(0, 5)} – {s.endTime?.slice(0, 5)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Effective From</Label>
                  <Input
                    type="date"
                    value={bulkEffectiveFrom}
                    onChange={(e) => setBulkEffectiveFrom(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => setConfirmAction({ type: "map-bulk", count: selectedStaffUuids.size })}
                    disabled={selectedStaffUuids.size === 0 || !bulkShiftUuid || mapBulk.isPending}
                    className="w-full gap-2 bg-violet-600 hover:bg-violet-700"
                  >
                    <Users className="h-4 w-4" />
                    {mapBulk.isPending
                      ? "Mapping..."
                      : `Map ${selectedStaffUuids.size} Staff`}
                  </Button>
                </div>
              </div>

              {/* Staff selection panel */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/40 px-4 py-3 flex items-center justify-between border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search staff..."
                        value={bulkSearch}
                        onChange={(e) => setBulkSearch(e.target.value)}
                        className="pl-9 h-8 w-[200px] text-xs"
                      />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {selectedStaffUuids.size} / {allStaff.length} selected
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={deselectAll}>
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
                  {filteredStaff.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">No staff found.</div>
                  ) : (
                    filteredStaff.map((s) => {
                      const isSelected = selectedStaffUuids.has(s.uuid);
                      return (
                        <label
                          key={s.uuid}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                            isSelected ? "bg-violet-50" : "hover:bg-muted/30"
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleStaff(s.uuid)}
                          />
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {s.firstName[0]}{s.lastName?.[0] ?? ""}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{s.firstName} {s.lastName}</p>
                            <p className="text-xs text-muted-foreground">{s.employeeId || "—"}</p>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-violet-600 shrink-0" />
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Current Mappings ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Current Mappings
              <Badge variant="secondary" className="ml-2">{mappingTotalElements}</Badge>
            </CardTitle>

            <Button
              variant={mappingEditMode ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setMappingEditMode((prev) => !prev)}
            >
              <SquarePen className="h-4 w-4" />
              {mappingEditMode ? "Done" : "Edit"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {mappingRows.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No shift mappings yet. Assign shifts to staff above.
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {mappingRows.map((m) => (
                <div
                  key={m.uuid}
                  className="group relative rounded-xl border border-border p-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  {mappingEditMode ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute right-2 top-2 h-7 px-2 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() =>
                        setConfirmAction({
                          type: "remove-mapping",
                          mappingUuid: m.uuid,
                          staffName: m.staffName,
                          shiftName: m.shiftName,
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}

                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-semibold text-emerald-600">
                      {(m.staffName || "?")[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.staffName}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.shiftName} • From {m.effectiveFrom}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {m.staffCategory ? m.staffCategory.replaceAll("_", " ") : "STAFF"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {m.shiftStartTime?.slice(0, 5)} – {m.shiftEndTime?.slice(0, 5)}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {mappingTotalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <p className="text-xs text-muted-foreground">
                Page {mappingPage + 1} of {mappingTotalPages} • {mappingTotalElements} total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMappingPage((prev) => Math.max(prev - 1, 0))}
                  disabled={mappingPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMappingPage((prev) => prev + 1)}
                  disabled={mappingPage + 1 >= mappingTotalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{shiftDialogMode === "create" ? "Create Shift" : "Edit Shift"}</DialogTitle>
            <DialogDescription>
              {shiftDialogMode === "create"
                ? "Define timings and applicable days for this shift."
                : "Update shift details and save changes with confirmation."}
            </DialogDescription>
          </DialogHeader>

          {renderShiftForm()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShiftDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!shiftForm.shiftName.trim() || shiftForm.applicableDays.length === 0}
              onClick={() =>
                setConfirmAction(
                  shiftDialogMode === "create"
                    ? { type: "create-shift" }
                    : { type: "update-shift", shiftUuid: editingShiftUuid ?? "" }
                )
              }
            >
              {shiftDialogMode === "create" ? "Create Shift" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmMeta.title}
        description={confirmMeta.description}
        confirmLabel={confirmMeta.confirmLabel}
        onConfirm={onConfirmAction}
        loading={confirmLoading}
        destructive={confirmMeta.destructive}
      />
    </div>
  );
}
