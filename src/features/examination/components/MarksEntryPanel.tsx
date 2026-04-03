import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Loader2,
  UserCheck,
  UserX,
  Stethoscope,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useGetMarksBySchedule,
  useRecordBulkMarks,
} from "../hooks/useExaminationQueries";
import type {
  ExamScheduleResponseDTO,
  ExamResponseDTO,
  StudentMarkRequestDTO,
  AttendanceStatus,
} from "@/services/types/examination";
import { toast } from "sonner";

interface Props {
  exam: ExamResponseDTO;
  schedule: ExamScheduleResponseDTO;
  onBack: () => void;
}

const attendanceIcons: Record<AttendanceStatus, React.ReactNode> = {
  PRESENT: <UserCheck className="w-3.5 h-3.5 text-emerald-600" />,
  ABSENT: <UserX className="w-3.5 h-3.5 text-red-500" />,
  MEDICAL: <Stethoscope className="w-3.5 h-3.5 text-amber-500" />,
};

const attendanceColors: Record<AttendanceStatus, string> = {
  PRESENT: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  ABSENT: "bg-red-500/10 text-red-600 border-red-500/20",
  MEDICAL: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

interface MarkRow {
  studentId: number;
  studentName: string;
  enrollmentNumber: string;
  marksObtained: number | undefined;
  attendanceStatus: AttendanceStatus;
  grade: string;
  remarks: string;
  markUuid?: string;
}

export default function MarksEntryPanel({ exam, schedule, onBack }: Props) {
  const { data: marks = [], isLoading } = useGetMarksBySchedule(
    schedule.scheduleId
  );
  const recordBulk = useRecordBulkMarks();

  const initialRows: MarkRow[] = useMemo(
    () =>
      marks.map((m) => ({
        studentId: m.studentId,
        studentName: m.studentName,
        enrollmentNumber: m.enrollmentNumber || "",
        marksObtained: m.marksObtained,
        attendanceStatus: m.attendanceStatus,
        grade: m.grade || "",
        remarks: m.remarks || "",
        markUuid: m.markUuid,
      })),
    [marks]
  );

  const [editedRows, setEditedRows] = useState<MarkRow[] | null>(null);
  const [dirty, setDirty] = useState(false);

  const rows = dirty && editedRows ? editedRows : initialRows;

  const updateRow = (
    idx: number,
    key: keyof MarkRow,
    val: string | number | undefined
  ) => {
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [key]: val };
    setEditedRows(updated);
    setDirty(true);
  };

  const handleSaveAll = () => {
    const payload: StudentMarkRequestDTO[] = rows.map((r) => ({
      studentId: r.studentId,
      marksObtained: r.marksObtained,
      attendanceStatus: r.attendanceStatus,
      remarks: r.remarks || undefined,
    }));

    recordBulk.mutate(
      { scheduleId: schedule.scheduleId, data: { marks: payload } },
      {
        onSuccess: () => {
          toast.success("Marks saved successfully");
          setDirty(false);
          setEditedRows(null);
        },
        onError: () => toast.error("Failed to save marks"),
      }
    );
  };

  const passCount = rows.filter(
    (r) =>
      r.attendanceStatus === "PRESENT" &&
      r.marksObtained !== undefined &&
      r.marksObtained >= schedule.passingMarks
  ).length;
  const absentCount = rows.filter(
    (r) => r.attendanceStatus === "ABSENT"
  ).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h3 className="font-semibold text-foreground text-lg">
              Marks Entry — {schedule.subjectName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {exam.name} · {schedule.className}
              {schedule.sectionName ? ` (${schedule.sectionName})` : ""} ·
              Max: {schedule.maxMarks} · Pass: {schedule.passingMarks}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {rows.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                {passCount} Pass
              </Badge>
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                {absentCount} Absent
              </Badge>
            </div>
          )}
          <Button
            onClick={handleSaveAll}
            size="sm"
            className="gap-1.5"
            disabled={!dirty || recordBulk.isPending || rows.length === 0}
          >
            {recordBulk.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save All
          </Button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[250px] rounded-2xl border-2 border-dashed border-border/60 gap-3 text-center">
          <div className="p-4 rounded-full bg-muted">
            <Hash className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">No student data</p>
          <p className="text-sm text-muted-foreground">
            No students are enrolled or linked to this schedule yet
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/60 overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Enrollment</TableHead>
                <TableHead className="w-[100px]">Marks</TableHead>
                <TableHead className="w-[140px]">Attendance</TableHead>
                <TableHead className="w-[80px] text-center">Grade</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow
                  key={row.studentId}
                  className="hover:bg-muted/20"
                >
                  <TableCell className="text-muted-foreground text-xs">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {row.studentName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.enrollmentNumber || "—"}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={row.marksObtained ?? ""}
                      onChange={(e) =>
                        updateRow(
                          idx,
                          "marksObtained",
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value)
                        )
                      }
                      min={0}
                      max={schedule.maxMarks}
                      className="h-8 w-20 text-sm"
                      disabled={row.attendanceStatus === "ABSENT"}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.attendanceStatus}
                      onValueChange={(v) =>
                        updateRow(
                          idx,
                          "attendanceStatus",
                          v as AttendanceStatus
                        )
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          ["PRESENT", "ABSENT", "MEDICAL"] as AttendanceStatus[]
                        ).map((s) => (
                          <SelectItem key={s} value={s}>
                            <span className="flex items-center gap-1.5">
                              {attendanceIcons[s]}
                              {s}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    {row.grade ? (
                      <Badge
                        variant="outline"
                        className={
                          attendanceColors[row.attendanceStatus] || ""
                        }
                      >
                        {row.grade}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.remarks}
                      onChange={(e) =>
                        updateRow(idx, "remarks", e.target.value)
                      }
                      placeholder="Optional"
                      className="h-8 text-sm"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      )}
    </div>
  );
}
