import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, List, Plus } from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import DataTable, { type Column } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";
import CalendarYearView from "@/features/hrms/CalendarYearView";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type {
  CalendarEventCreateDTO,
  CalendarEventResponseDTO,
  DayType,
} from "@/services/types/hrms";

const currentYear = new Date().getFullYear();
const todayIso = new Date().toISOString().slice(0, 10);

const DAY_TYPES: DayType[] = [
  "WORKING",
  "HOLIDAY",
  "HALF_DAY",
  "RESTRICTED_HOLIDAY",
  "EXAM_DAY",
  "VACATION",
];

const dayTypeColor: Record<DayType, "default" | "secondary" | "destructive" | "outline"> = {
  WORKING: "default",
  HOLIDAY: "destructive",
  HALF_DAY: "secondary",
  RESTRICTED_HOLIDAY: "outline",
  EXAM_DAY: "secondary",
  VACATION: "destructive",
};

const initialForm: CalendarEventCreateDTO = {
  academicYear: `${currentYear}-${currentYear + 1}`,
  date: todayIso,
  dayType: "HOLIDAY",
  title: "",
  description: "",
  appliesToStaff: true,
  appliesToStudents: true,
};

type ViewMode = "calendar" | "table";

export default function LeaveCalendarDesigner() {
  const queryClient = useQueryClient();
  const { formatDate } = useHrmsFormatters();
  const [academicYear, setAcademicYear] = useState(`${currentYear}-${currentYear + 1}`);
  const [calendarYear, setCalendarYear] = useState(currentYear);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [formOpen, setFormOpen] = useState(false);
  const [saveReviewOpen, setSaveReviewOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEventResponseDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CalendarEventResponseDTO | null>(null);
  const [form, setForm] = useState<CalendarEventCreateDTO>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const listQuery = useQuery({
    queryKey: ["hrms", "calendar", "events", academicYear],
    queryFn: () =>
      hrmsService
        .listCalendarEvents({ academicYear })
        .then((res) => res.data),
  });

  const summaryQuery = useQuery({
    queryKey: ["hrms", "calendar", "summary", academicYear],
    queryFn: () => hrmsService.getCalendarSummary(academicYear).then((res) => res.data),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["hrms", "calendar", "events", academicYear] });
    queryClient.invalidateQueries({ queryKey: ["hrms", "calendar", "summary", academicYear] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: CalendarEventCreateDTO) =>
      editing
        ? hrmsService.updateCalendarEvent(editing.uuid, payload)
        : hrmsService.createCalendarEvent(payload),
    onSuccess: () => {
      toast.success(editing ? "Calendar event updated" : "Calendar event created");
      closeForm();
      refresh();
    },
    onError: (error) => {
      const normalized = normalizeHrmsError(error);
      setFieldErrors(normalized.fieldErrors ?? {});
      toast.error(normalized.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hrmsService.deleteCalendarEvent(id),
    onSuccess: () => {
      toast.success("Calendar event deleted");
      setDeleteTarget(null);
      refresh();
    },
    onError: (error) => toast.error(normalizeHrmsError(error).message),
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
    setForm({ ...initialForm, academicYear });
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEdit = (row: CalendarEventResponseDTO) => {
    setEditing(row);
    setForm({
      academicYear: row.academicYear,
      date: row.date,
      dayType: row.dayType,
      title: row.title ?? "",
      description: row.description ?? "",
      appliesToStaff: row.appliesToStaff,
      appliesToStudents: row.appliesToStudents,
    });
    setFieldErrors({});
    setFormOpen(true);
  };

  const rows = Array.isArray(listQuery.data) ? listQuery.data : [];

  const columns = useMemo<Column<CalendarEventResponseDTO>[]>(
    () => [
      {
        key: "date",
        header: "Date",
        searchable: true,
        render: (row) => formatDate(row.date),
      },
      { key: "title", header: "Title", searchable: true, render: (row) => row.title || "-" },
      {
        key: "dayType",
        header: "Day Type",
        render: (row) => (
          <Badge variant={dayTypeColor[row.dayType] ?? "secondary"}>
            {row.dayType.replace(/_/g, " ")}
          </Badge>
        ),
      },
      {
        key: "scope",
        header: "Applies To",
        render: (row) => {
          const parts: string[] = [];
          if (row.appliesToStaff) parts.push("Staff");
          if (row.appliesToStudents) parts.push("Students");
          return parts.join(", ") || "-";
        },
      },
    ],
    [formatDate],
  );

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Working Days</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summaryQuery.data?.totalWorkingDays ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Holidays</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summaryQuery.data?.totalHolidays ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Half Days</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summaryQuery.data?.totalHalfDays ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Academic Year</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="e.g. 2025-2026"
            />
          </CardContent>
        </Card>
      </div>

      {/* View Toggle + Add Event */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant={viewMode === "calendar" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("calendar")}
            className="gap-1.5"
          >
            <CalendarDays className="h-4 w-4" />
            Calendar
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="gap-1.5"
          >
            <List className="h-4 w-4" />
            Table
          </Button>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Event
        </Button>
      </div>

      {/* Error State */}
      {(listQuery.isError || summaryQuery.isError) && (
        <div className="space-y-3 rounded-lg border border-destructive/30 p-4">
          <p className="text-sm text-destructive">
            {listQuery.isError
              ? normalizeHrmsError(listQuery.error).message
              : normalizeHrmsError(summaryQuery.error).message}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void listQuery.refetch();
              void summaryQuery.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === "calendar" && (
        <CalendarYearView
          year={calendarYear}
          onYearChange={setCalendarYear}
          events={rows}
        />
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.uuid}
          onEdit={openEdit}
          onDelete={(row) => setDeleteTarget(row)}
          emptyMessage={
            listQuery.isLoading ? "Loading calendar events..." : "No calendar events found."
          }
        />
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Calendar Event" : "Create Calendar Event"}</DialogTitle>
            <DialogDescription>
              Calendar events drive leave & payroll working-day calculations.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="cal-academic-year">Academic Year</Label>
              <Input
                id="cal-academic-year"
                value={form.academicYear}
                onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))}
                placeholder="2025-2026"
              />
              {fieldErrors.academicYear?.[0] && (
                <p className="text-xs text-destructive">{fieldErrors.academicYear[0]}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cal-date">Date</Label>
              <Input
                id="cal-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              />
              {fieldErrors.date?.[0] && (
                <p className="text-xs text-destructive">{fieldErrors.date[0]}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Day Type</Label>
              <Select
                value={form.dayType}
                onValueChange={(value) =>
                  setForm((p) => ({ ...p, dayType: value as DayType }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select day type" />
                </SelectTrigger>
                <SelectContent>
                  {DAY_TYPES.map((dt) => (
                    <SelectItem key={dt} value={dt}>
                      {dt.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.dayType?.[0] && (
                <p className="text-xs text-destructive">{fieldErrors.dayType[0]}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cal-title">Title</Label>
              <Input
                id="cal-title"
                value={form.title ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Diwali, Republic Day"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cal-desc">Description</Label>
              <Textarea
                id="cal-desc"
                value={form.description ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="cal-staff"
                  checked={form.appliesToStaff ?? true}
                  onCheckedChange={(checked) =>
                    setForm((p) => ({ ...p, appliesToStaff: checked }))
                  }
                />
                <Label htmlFor="cal-staff">Applies to Staff</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="cal-students"
                  checked={form.appliesToStudents ?? true}
                  onCheckedChange={(checked) =>
                    setForm((p) => ({ ...p, appliesToStudents: checked }))
                  }
                />
                <Label htmlFor="cal-students">Applies to Students</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button
              disabled={
                saveMutation.isPending || !form.date || !form.dayType || !form.academicYear
              }
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
        title={editing ? "Confirm Calendar Event Update" : "Confirm Calendar Event Creation"}
        description="Review calendar event details before saving."
        severity="warning"
        confirmLabel={editing ? "Save Changes" : "Create Event"}
        isPending={saveMutation.isPending}
        requireCheckbox
        checkboxLabel="I verified date, day type, and applicability settings."
        onConfirm={() => saveMutation.mutate(form)}
      >
        <div className="space-y-1 text-sm">
          <p>Date: <span className="font-medium">{form.date || "-"}</span></p>
          <p>Type: <span className="font-medium">{form.dayType}</span></p>
          <p>Title: <span className="font-medium">{form.title?.trim() || "-"}</span></p>
        </div>
      </ReviewDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete calendar event?"
        description={`This will remove "${deleteTarget?.title ?? "this event"}" on ${formatDate(deleteTarget?.date)}.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.uuid);
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
