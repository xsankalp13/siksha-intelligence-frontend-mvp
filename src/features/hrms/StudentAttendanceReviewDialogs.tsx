import { useState, useEffect } from "react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { attendanceService } from "@/services/attendance";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import TableSkeleton from "@/components/common/TableSkeleton";
import { CalendarDays, GraduationCap, Link as LinkIcon } from "lucide-react";

export function EditStudentAttendanceDialog({
  open,
  onOpenChange,
  record,
  onSuccess
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: any | null;
  onSuccess: () => void;
}) {
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (record) {
      setStatus(record.attendanceTypeShortCode);
      setNotes(record.notes || record.note || record.remarks || "");
    }
  }, [record]);

  const handleSubmit = async () => {
    if (!record?.uuid) return;
    setLoading(true);
    try {
      await attendanceService.updateStudentAttendance(record.uuid, {
        studentUuid: record.studentUuid,
        studentId: record.studentId, // fallback
        attendanceShortCode: status,
        attendanceDate: record.attendanceDate,
        takenByStaffUuid: record.takenByStaffUuid,
        notes: notes,
      } as any);
      toast.success("Attendance updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast.error("Failed to update attendance");
    } finally {
      setLoading(false);
    }
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Attendance Record</DialogTitle>
          <DialogDescription>
            Update attendance for {record.studentFullName || record.studentName || "Student"} on {record.attendanceDate}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="P">Present (P)</SelectItem>
                <SelectItem value="A">Absent (A)</SelectItem>
                <SelectItem value="L">Late (L)</SelectItem>
                <SelectItem value="LV">On Leave (LV)</SelectItem>
                <SelectItem value="HD">Half Day (HD)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes & Remarks</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add optional notes about the attendance..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StudentAttendanceHistoryDialog({
  open,
  onOpenChange,
  studentInfo
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentInfo: { uuid?: string, studentId?: number, name?: string } | null;
}) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !studentInfo) return;
    fetchHistory();
  }, [open, studentInfo]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await attendanceService.listStudentAttendance({
        search: studentInfo?.name, // Use name since we may not have direct searching by UUID in some backend versions, or we can use UUID if the backend supports tracking
      });
      // Filter strictly locally just in case
      let content = res.data.content;
      if (studentInfo?.uuid) {
        content = content.filter(c => c.studentUuid === studentInfo.uuid);
      } else if (studentInfo?.studentId) {
        content = content.filter(c => c.studentId === studentInfo.studentId);
      }
      setHistory(content.slice(0, 30)); // Show last 30
    } catch {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  if (!studentInfo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Detailed Attendance History
              </DialogTitle>
              <DialogDescription className="mt-1">
                Recent attendance records for {studentInfo.name || "selected student"}.
              </DialogDescription>
            </div>
            {studentInfo.uuid && (
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link to={`/dashboard/admin/users/student/${studentInfo.uuid}`}>
                  <LinkIcon className="h-3 w-3" />
                  View Full Profile
                </Link>
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-4 pr-1">
          {loading ? (
            <TableSkeleton rows={5} columns={4} />
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent attendance history found.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left font-medium">Date</th>
                    <th className="p-3 text-left font-medium">Status</th>
                    <th className="p-3 text-left font-medium">Marked By</th>
                    <th className="p-3 text-left font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map((record) => (
                    <tr key={record.uuid} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3">{record.attendanceDate}</td>
                      <td className="p-3">
                        <span className="font-semibold">{record.attendanceTypeShortCode}</span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {record.takenByStaffName || record.takenByName || record.markedByName || "—"}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {record.notes || record.note || record.remarks || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
