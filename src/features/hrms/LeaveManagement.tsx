import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
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
import { useAppSelector } from "@/store/hooks";
import type {
  LeaveApplicationCreateDTO,
  LeaveApplicationResponseDTO,
  LeaveReviewDTO,
  StaffCategory,
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

type LeaveAction = "approve" | "reject" | "cancel";

const statusOptions: Array<"ALL" | LeaveStatus> = ["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"];
const categoryOptions: Array<"ALL" | StaffCategory> = [
  "ALL",
  "TEACHING",
  "NON_TEACHING_ADMIN",
  "NON_TEACHING_SUPPORT",
];

const statusColor: Record<LeaveStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
  CANCELLED: "secondary",
};

export default function LeaveManagement() {
  const queryClient = useQueryClient();
  const { formatDate } = useHrmsFormatters();
  const currentUserId = useAppSelector((s) => Number(s.auth.user?.userId ?? 0));
  const [status, setStatus] = useState<"ALL" | LeaveStatus>("ALL");
  const [category, setCategory] = useState<"ALL" | StaffCategory>("ALL");
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyConfirmOpen, setApplyConfirmOpen] = useState(false);
  const [applyForm, setApplyForm] = useState<LeaveApplicationCreateDTO>(initialApplyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [actionTarget, setActionTarget] = useState<{
    row: LeaveApplicationResponseDTO;
    action: LeaveAction;
  } | null>(null);
  const [remarks, setRemarks] = useState("");

  const leaveTypesQuery = useQuery({
    queryKey: ["hrms", "leave-types"],
    queryFn: () => hrmsService.listLeaveTypes().then((res) => res.data),
  });

  const leavesQuery = useQuery({
    queryKey: ["hrms", "leaves", status, category],
    queryFn: () =>
      hrmsService
        .listLeaveApplications({
          page: 0,
          size: 100,
          sort: ["appliedOn,desc"],
          status: status === "ALL" ? undefined : status,
          category: category === "ALL" ? undefined : category,
        })
        .then((res) => res.data),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["hrms", "leaves"] });
    queryClient.invalidateQueries({ queryKey: ["hrms", "leave-balances"] });
  };

  const applyMutation = useMutation({
    mutationFn: (payload: LeaveApplicationCreateDTO) => hrmsService.applyLeave(payload),
    onSuccess: () => {
      toast.success("Leave application submitted");
      setApplyConfirmOpen(false);
      setApplyOpen(false);
      setApplyForm(initialApplyForm);
      setFieldErrors({});
      refresh();
    },
    onError: (error) => {
      const normalized = normalizeHrmsError(error);
      setFieldErrors(normalized.fieldErrors ?? {});
      toast.error(normalized.message);
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({
      applicationId,
      action,
      payload,
    }: {
      applicationId: string;
      action: LeaveAction;
      payload?: LeaveReviewDTO;
    }) => {
      if (action === "approve") return hrmsService.approveLeave(applicationId, payload);
      if (action === "reject") return hrmsService.rejectLeave(applicationId, payload);
      return hrmsService.cancelLeave(applicationId, payload);
    },
    onSuccess: (_, vars) => {
      const label: Record<LeaveAction, string> = {
        approve: "approved",
        reject: "rejected",
        cancel: "cancelled",
      };
      toast.success(`Leave ${label[vars.action]} successfully`);
      setActionTarget(null);
      setRemarks("");
      refresh();
    },
    onError: (error) => toast.error(normalizeHrmsError(error).message),
  });

  const rows = leavesQuery.data?.content ?? [];

  const columns = useMemo<Column<LeaveApplicationResponseDTO>[]>(
    () => [
      { key: "staffName", header: "Staff", searchable: true },
      {
        key: "staffCategory",
        header: "Category",
        render: (row) => (
          <Badge variant="outline">{row.staffCategory?.replace(/_/g, " ") ?? "-"}</Badge>
        ),
      },
      {
        key: "designation",
        header: "Designation",
        render: (row) => row.designationName ?? "-",
      },
      {
        key: "leaveType",
        header: "Leave Type",
        render: (row) => `${row.leaveTypeName} (${row.leaveTypeCode})`,
        searchable: true,
      },
      {
        key: "fromDate",
        header: "From",
        render: (row) => formatDate(row.fromDate),
      },
      {
        key: "toDate",
        header: "To",
        render: (row) => formatDate(row.toDate),
      },
      {
        key: "totalDays",
        header: "Days",
        render: (row) => {
          const suffix = row.isHalfDay ? ` (${row.halfDayType === "FIRST_HALF" ? "1st" : "2nd"} half)` : "";
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
      {
        key: "reason",
        header: "Reason",
        render: (row) => <span className="max-w-[200px] truncate block">{row.reason || "-"}</span>,
      },
      {
        key: "reviewedBy",
        header: "Reviewed By",
        render: (row) =>
          row.reviewedByName
            ? `${row.reviewedByName} (${formatDate(row.reviewedAt)})`
            : "-",
      },
      {
        key: "workflow",
        header: "Actions",
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={row.status !== "PENDING" || (currentUserId > 0 && currentUserId === row.staffId)}
              onClick={() => setActionTarget({ row, action: "approve" })}
            >
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={row.status !== "PENDING"}
              onClick={() => setActionTarget({ row, action: "reject" })}
            >
              Reject
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={row.status !== "APPROVED" && row.status !== "PENDING"}
              onClick={() => setActionTarget({ row, action: "cancel" })}
            >
              Cancel
            </Button>
          </div>
        ),
      },
    ],
    [currentUserId, formatDate],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Leave Management</h3>
        <div className="flex items-center gap-2">
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as "ALL" | LeaveStatus)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={category}
            onValueChange={(value) => setCategory(value as "ALL" | StaffCategory)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option.replace(/_/g, " ")}
                </SelectItem>
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

      {(leavesQuery.isError || leaveTypesQuery.isError) && (
        <div className="space-y-3 rounded-lg border border-destructive/30 p-4">
          <p className="text-sm text-destructive">
            {leavesQuery.isError
              ? normalizeHrmsError(leavesQuery.error).message
              : normalizeHrmsError(leaveTypesQuery.error).message}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void leavesQuery.refetch();
              void leaveTypesQuery.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.uuid ?? String(row.applicationId)}
        emptyMessage={leavesQuery.isLoading ? "Loading leaves..." : "No leave requests found."}
      />

      {/* Apply Leave Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Leave</DialogTitle>
            <DialogDescription>Submit a leave request for approval workflow.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Leave Type</Label>
              <Select
                value={applyForm.leaveTypeRef || undefined}
                onValueChange={(value) =>
                  setApplyForm((prev) => ({ ...prev, leaveTypeRef: value }))
                }
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
                <Label htmlFor="leave-from">From Date</Label>
                <Input
                  id="leave-from"
                  type="date"
                  value={applyForm.fromDate}
                  onChange={(e) =>
                    setApplyForm((prev) => ({ ...prev, fromDate: e.target.value }))
                  }
                />
                {fieldErrors.fromDate?.[0] && (
                  <p className="text-xs text-destructive">{fieldErrors.fromDate[0]}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="leave-to">To Date</Label>
                <Input
                  id="leave-to"
                  type="date"
                  value={applyForm.toDate}
                  onChange={(e) =>
                    setApplyForm((prev) => ({ ...prev, toDate: e.target.value }))
                  }
                />
                {fieldErrors.toDate?.[0] && (
                  <p className="text-xs text-destructive">{fieldErrors.toDate[0]}</p>
                )}
              </div>
            </div>

            {/* Half-day toggle */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="leave-half"
                  checked={applyForm.isHalfDay ?? false}
                  onCheckedChange={(checked) =>
                    setApplyForm((prev) => ({
                      ...prev,
                      isHalfDay: checked,
                      halfDayType: checked ? "FIRST_HALF" : undefined,
                    }))
                  }
                />
                <Label htmlFor="leave-half">Half Day</Label>
              </div>
              {applyForm.isHalfDay && (
                <Select
                  value={applyForm.halfDayType ?? "FIRST_HALF"}
                  onValueChange={(value) =>
                    setApplyForm((prev) => ({
                      ...prev,
                      halfDayType: value as "FIRST_HALF" | "SECOND_HALF",
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
              <Label htmlFor="leave-reason">Reason</Label>
              <Textarea
                id="leave-reason"
                value={applyForm.reason ?? ""}
                maxLength={500}
                onChange={(e) =>
                  setApplyForm((prev) => ({ ...prev, reason: e.target.value }))
                }
              />
              {fieldErrors.reason?.[0] && (
                <p className="text-xs text-destructive">{fieldErrors.reason[0]}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="leave-attachment">Attachment URL (optional)</Label>
              <Input
                id="leave-attachment"
                value={applyForm.attachmentUrl ?? ""}
                onChange={(e) =>
                  setApplyForm((prev) => ({ ...prev, attachmentUrl: e.target.value }))
                }
                placeholder="https://..."
              />
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

      <ReviewDialog
        open={Boolean(actionTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setActionTarget(null);
            setRemarks("");
          }
        }}
        title={
          actionTarget
            ? `${actionTarget.action.charAt(0).toUpperCase() + actionTarget.action.slice(1)} Leave?`
            : "Leave Action"
        }
        description={
          actionTarget
            ? `${actionTarget.action.toUpperCase()} leave for ${actionTarget.row.staffName} (${actionTarget.row.leaveTypeName}, ${actionTarget.row.totalDays} days)`
            : "Confirm leave action"
        }
        severity={actionTarget?.action === "approve" ? "warning" : "danger"}
        confirmLabel={actionTarget?.action.toUpperCase() ?? "CONFIRM"}
        isPending={actionMutation.isPending}
        requireCheckbox
        checkboxLabel="I have reviewed this leave request and want to proceed with this action."
        onConfirm={() => {
          if (!actionTarget) return;
          actionMutation.mutate({
            applicationId: actionTarget.row.uuid ?? String(actionTarget.row.applicationId),
            action: actionTarget.action,
            payload: remarks ? { remarks } : undefined,
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="leave-action-remarks">Reviewer Remarks (optional)</Label>
          <Textarea
            id="leave-action-remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add reviewer remarks"
          />
        </div>
      </ReviewDialog>
      <ReviewDialog
        open={applyConfirmOpen}
        onOpenChange={setApplyConfirmOpen}
        title="Confirm Leave Application"
        description="Please review leave details before submitting for approval."
        severity="warning"
        confirmLabel="Submit Leave"
        isPending={applyMutation.isPending}
        requireCheckbox
        checkboxLabel="I confirm these leave details are accurate."
        onConfirm={() => applyMutation.mutate(applyForm)}
      >
        <div className="space-y-1 text-sm">
          <p>From: <span className="font-medium">{applyForm.fromDate || "-"}</span></p>
          <p>To: <span className="font-medium">{applyForm.toDate || "-"}</span></p>
          <p>Half Day: <span className="font-medium">{applyForm.isHalfDay ? applyForm.halfDayType ?? "Yes" : "No"}</span></p>
          <p>Reason: <span className="font-medium">{applyForm.reason?.trim() || "-"}</span></p>
        </div>
      </ReviewDialog>
    </div>
  );
}
