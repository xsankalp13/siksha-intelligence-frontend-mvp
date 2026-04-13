import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type {
  LeaveApplicationCreateDTO,
  LeaveApplicationResponseDTO,
  LeaveStatus,
} from "@/services/types/hrms";

const initialApplyForm: LeaveApplicationCreateDTO = {
  leaveTypeRef: "",
  fromDate: "",
  toDate: "",
  isHalfDay: false,
  halfDayType: undefined,
  reason: "",
  attachmentUrl: "",
};

const statusOptions: Array<"ALL" | LeaveStatus> = ["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"];

const statusColor: Record<LeaveStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
  CANCELLED: "secondary",
};

const getStatusCode = (error: unknown): number | undefined =>
  axios.isAxiosError(error) ? error.response?.status : undefined;

export default function TeacherMyLeaves() {
  const queryClient = useQueryClient();
  const { formatDate } = useHrmsFormatters();
  const [status, setStatus] = useState<"ALL" | LeaveStatus>("ALL");
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyConfirmOpen, setApplyConfirmOpen] = useState(false);
  const [applyForm, setApplyForm] = useState<LeaveApplicationCreateDTO>(initialApplyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [cancelTarget, setCancelTarget] = useState<LeaveApplicationResponseDTO | null>(null);

  const leaveTypesQuery = useQuery({
    queryKey: ["hrms", "leave-types"],
    queryFn: async () => {
      try {
        const res = await hrmsService.listLeaveTypes();
        return res.data;
      } catch (error) {
        if (getStatusCode(error) === 403 || getStatusCode(error) === 404) {
          return [];
        }
        throw error;
      }
    },
  });

  const leavesQuery = useQuery({
    queryKey: ["hrms", "self", "leaves", status],
    queryFn: async () => {
      const params = {
        page: 0,
        size: 100,
        sort: ["appliedOn,desc"],
        status: status === "ALL" ? undefined : status,
      };
      try {
        const res = await hrmsService.listLeaveApplications(params);
        return res.data;
      } catch (error) {
        if (getStatusCode(error) === 403 || getStatusCode(error) === 404) {
          return { content: [], totalElements: 0, totalPages: 0 };
        }
        throw error;
      }
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["hrms", "self", "leaves"] });
    queryClient.invalidateQueries({ queryKey: ["hrms", "leave-balances", "me"] });
  };

  const applyMutation = useMutation({
    mutationFn: async (payload: LeaveApplicationCreateDTO) => {
      return await hrmsService.applyLeave(payload);
    },
    onSuccess: () => {
      toast.success("Leave application submitted");
      setApplyConfirmOpen(false);
      setApplyOpen(false);
      setApplyForm(initialApplyForm);
      setFieldErrors({});
      refresh();
    },
    onError: (err) => {
      const normalized = normalizeHrmsError(err);
      setFieldErrors(normalized.fieldErrors ?? {});
      toast.error(normalized.message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      return await hrmsService.cancelLeave(applicationId);
    },
    onSuccess: () => {
      toast.success("Leave cancelled");
      setCancelTarget(null);
      refresh();
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const columns = useMemo<Column<LeaveApplicationResponseDTO>[]>(
    () => [
      {
        key: "leaveType",
        header: "Leave Type",
        render: (row) => `${row.leaveTypeName} (${row.leaveTypeCode})`,
        searchable: true,
      },
      { key: "fromDate", header: "From", render: (row) => formatDate(row.fromDate) },
      { key: "toDate", header: "To", render: (row) => formatDate(row.toDate) },
      {
        key: "totalDays",
        header: "Days",
        render: (row) => {
          const suffix = row.isHalfDay
            ? ` (${row.halfDayType === "FIRST_HALF" ? "1st" : "2nd"} half)`
            : "";
          return `${row.totalDays}${suffix}`;
        },
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <Badge variant={statusColor[row.status] ?? "secondary"}>{row.status}</Badge>
        ),
      },
      { key: "reason", header: "Reason", render: (row) => row.reason || "-" },
      {
        key: "reviewRemarks",
        header: "Reviewer",
        render: (row) => row.reviewRemarks || "-",
      },
      {
        key: "cancel",
        header: "Action",
        render: (row) => (
          <Button
            size="sm"
            variant="outline"
            disabled={row.status !== "PENDING" && row.status !== "APPROVED"}
            onClick={() => setCancelTarget(row)}
          >
            Cancel
          </Button>
        ),
      },
    ],
    [formatDate],
  );

  const hasError = leavesQuery.isError || leaveTypesQuery.isError;

  return (
    <div className="space-y-4">
      {hasError && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-700">
            ⚠️ Some leave data could not be loaded. You can still view existing requests and apply for leave.
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold">My Leave Requests</h3>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v as "ALL" | LeaveStatus)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            onClick={() => {
              setApplyForm(initialApplyForm);
              setFieldErrors({});
              setApplyOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Apply Leave
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={leavesQuery.data?.content ?? []}
        getRowId={(row) => row.uuid ?? String(row.applicationId)}
        emptyMessage={leavesQuery.isLoading ? "Loading leaves..." : "No leave requests found."}
      />

      {/* Apply Leave Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Leave</DialogTitle>
            <DialogDescription>Submit leave request from self-service portal.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Leave Type</Label>
              <Select
                value={applyForm.leaveTypeRef || undefined}
                onValueChange={(v) => setApplyForm((p) => ({ ...p, leaveTypeRef: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {(leaveTypesQuery.data ?? []).map((type) => (
                    <SelectItem key={type.leaveTypeId} value={type.uuid}>
                      {type.displayName} ({type.leaveCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(fieldErrors.leaveTypeRef?.[0] ?? fieldErrors.leaveTypeId?.[0]) && (
                <p className="text-xs text-destructive">{fieldErrors.leaveTypeRef?.[0] ?? fieldErrors.leaveTypeId?.[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="my-leave-from">From Date</Label>
                <Input
                  id="my-leave-from"
                  type="date"
                  value={applyForm.fromDate}
                  onChange={(e) => setApplyForm((p) => ({ ...p, fromDate: e.target.value }))}
                />
                {fieldErrors.fromDate?.[0] && <p className="text-xs text-destructive">{fieldErrors.fromDate[0]}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="my-leave-to">To Date</Label>
                <Input
                  id="my-leave-to"
                  type="date"
                  value={applyForm.toDate}
                  onChange={(e) => setApplyForm((p) => ({ ...p, toDate: e.target.value }))}
                />
                {fieldErrors.toDate?.[0] && <p className="text-xs text-destructive">{fieldErrors.toDate[0]}</p>}
              </div>
            </div>

            {/* Half-day toggle */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="my-leave-half"
                  checked={applyForm.isHalfDay ?? false}
                  onCheckedChange={(checked) =>
                    setApplyForm((p) => ({
                      ...p,
                      isHalfDay: checked,
                      halfDayType: checked ? "FIRST_HALF" : undefined,
                    }))
                  }
                />
                <Label htmlFor="my-leave-half">Half Day</Label>
              </div>
              {applyForm.isHalfDay && (
                <Select
                  value={applyForm.halfDayType ?? "FIRST_HALF"}
                  onValueChange={(v) =>
                    setApplyForm((p) => ({
                      ...p,
                      halfDayType: v as "FIRST_HALF" | "SECOND_HALF",
                    }))
                  }
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIRST_HALF">First Half</SelectItem>
                    <SelectItem value="SECOND_HALF">Second Half</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="my-leave-reason">Reason</Label>
              <Textarea
                id="my-leave-reason"
                value={applyForm.reason ?? ""}
                maxLength={500}
                onChange={(e) => setApplyForm((p) => ({ ...p, reason: e.target.value }))}
              />
              {fieldErrors.reason?.[0] && <p className="text-xs text-destructive">{fieldErrors.reason[0]}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button
              disabled={
                applyMutation.isPending ||
                !applyForm.leaveTypeRef ||
                !applyForm.fromDate ||
                !applyForm.toDate ||
                !applyForm.reason
              }
              onClick={() => setApplyConfirmOpen(true)}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => { if (!open) setCancelTarget(null); }}
        title="Cancel leave request?"
        description={
          cancelTarget
            ? `Cancel leave #${cancelTarget.applicationId} (${cancelTarget.leaveTypeName}, ${cancelTarget.totalDays} day${cancelTarget.totalDays > 1 ? "s" : ""}).`
            : "Cancel selected leave."
        }
        confirmLabel="Cancel Leave"
        onConfirm={() => { if (cancelTarget) cancelMutation.mutate(cancelTarget.uuid ?? String(cancelTarget.applicationId)); }}
        loading={cancelMutation.isPending}
      />

      <ReviewDialog
        open={applyConfirmOpen}
        onOpenChange={setApplyConfirmOpen}
        title="Confirm Leave Application"
        description="Please review your leave details before submission."
        severity="warning"
        confirmLabel="Submit Leave"
        isPending={applyMutation.isPending}
        requireCheckbox
        checkboxLabel="I confirm this leave request is correct."
        onConfirm={() => applyMutation.mutate(applyForm)}
      >
        <div className="space-y-1 text-sm">
          <p>From: <span className="font-medium">{applyForm.fromDate || "-"}</span></p>
          <p>To: <span className="font-medium">{applyForm.toDate || "-"}</span></p>
          <p>Reason: <span className="font-medium">{applyForm.reason?.trim() || "-"}</span></p>
        </div>
      </ReviewDialog>
    </div>
  );
}
