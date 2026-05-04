import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Loader2,
  Armchair,
  Search,
  Users,
  Calendar,
  DoorOpen,
  Sparkles,
  CheckSquare,
  XSquare,
  Trash2,
  Printer,
  GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useGetAllocationsForSchedule,
  useGetAvailableRooms,
  useGetSeatGrid,
  useAllocateSingleSeat,
  useAutoAllocateSeatsBulk,
  useRemoveAllocation,
  useBulkRemoveAllocations,
  useGetBulkSeatGrids,
} from "../hooks/useSeatAllocationQueries";
import { useGetAllExams, useGetSchedulesByExam } from "../hooks/useExaminationQueries";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { ExamResponseDTO } from "@/services/types/examination";
import type { SeatAllocationResponseDTO } from "@/services/types/seatAllocation";
import { toast } from "sonner";
import { examinationService } from "@/services/examination";
import { seatAllocationService } from "@/services/seatAllocation";
import { GlobalSeatingModal } from "./GlobalSeatingModal";

// ── Position label mapping (UI only) ────────────────────────────────
const POSITION_LABELS: Record<number, string> = { 0: "L", 1: "M", 2: "R" };
const POSITION_FULL_LABELS: Record<number, string> = { 0: "LEFT", 1: "MIDDLE", 2: "RIGHT" };

interface StudentSummary {
  uuid: string;
  firstName: string;
  lastName: string;
  enrollmentNumber?: string;
  id: number;
}
interface StudentPage {
  content: StudentSummary[];
}

export default function SeatingPlanPanel() {
  // ── Selection state ─────────────────────────────────────────────
  const [selectedExamUuid, setSelectedExamUuid] = useState<string>("");
  const [selectedClassUuid, setSelectedClassUuid] = useState<string>("");
  const [selectedScheduleId, setSelectedScheduleId] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);
  const [viewMode, setViewMode] = useState<"admin" | "seatcheck">("seatcheck");

  // ── Bulk selection state ────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SeatAllocationResponseDTO | null>(null);

  // ── Dialog state ────────────────────────────────────────────────
  const [assignOpen, setAssignOpen] = useState(false);
  const [formStudentId, setFormStudentId] = useState<string>("");
  const [formRoomUuid, setFormRoomUuid] = useState<string>("");
  const [formSeatId, setFormSeatId] = useState<number>(0);

  // ── Auto-Fill state ─────────────────────────────────────────────
  const [autoFillOpen, setAutoFillOpen] = useState(false);
  const [autoFillRoomUuid, setAutoFillRoomUuid] = useState<string>("");
  const [globalModalOpen, setGlobalModalOpen] = useState(false);

  // ── Queries ─────────────────────────────────────────────────────
  const { data: exams = [] } = useGetAllExams();
  const { data: schedules = [] } = useGetSchedulesByExam(selectedExamUuid);

  const { data: allocations = [], isLoading } = useGetAllocationsForSchedule(selectedScheduleId);
  const { data: availableRooms = [], isLoading: isLoadingRooms } = useGetAvailableRooms(selectedScheduleId);
  const { data: seatGrid = [], isLoading: isLoadingGrid } = useGetSeatGrid(formRoomUuid, selectedScheduleId);

  const { data: studentPage } = useQuery<StudentPage>({
    queryKey: ["students", "all-for-seating"],
    queryFn: async () =>
      (await api.get("/auth/admin/users/students", { params: { size: 500 } })).data,
    staleTime: 10 * 60 * 1000,
  });
  const studentList = studentPage?.content ?? [];

  // ── Room Seat Grid Queries (for Seat Check with cross-exam info) ─
  const roomUuidsForGrid = useMemo(() => {
    if (!selectedScheduleId || allocations.length === 0) return [];
    const roomNames = new Set(allocations.map((a) => a.roomName));
    return availableRooms
      .filter((r) => roomNames.has(r.roomName))
      .map((r) => ({ uuid: r.roomUuid, name: r.roomName }));
  }, [allocations, availableRooms, selectedScheduleId]);

  const { data: bulkGridData, isLoading: isBulkLoading } = useGetBulkSeatGrids(
    viewMode === "seatcheck" ? roomUuidsForGrid.map(r => r.uuid) : [],
    selectedScheduleId
  );

  // ── Mutations ───────────────────────────────────────────────────
  const assignSeatMutation = useAllocateSingleSeat();
  const autoFillMutation = useAutoAllocateSeatsBulk();
  const removeMutation = useRemoveAllocation();
  const bulkRemoveMutation = useBulkRemoveAllocations();

  // ── Derived ─────────────────────────────────────────────────────
  const selectedSchedule = useMemo(
    () => schedules.find((s) => s.scheduleId === selectedScheduleId),
    [schedules, selectedScheduleId]
  );
  const selectedExam: ExamResponseDTO | undefined = exams.find(
    (e) => e.uuid === selectedExamUuid
  );

  // Derive unique classes from schedules
  const availableClasses = useMemo(() => {
    const classMap = new Map<string, { uuid: string; name: string }>();
    schedules.forEach((s) => {
      if (s.classId && !classMap.has(s.classId)) {
        classMap.set(s.classId, { uuid: s.classId, name: s.className });
      }
    });
    return Array.from(classMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [schedules]);

  // Filter schedules by selected class
  const filteredSchedulesByClass = useMemo(() => {
    if (!selectedClassUuid) return [];
    return schedules.filter((s) => s.classId === selectedClassUuid);
  }, [schedules, selectedClassUuid]);

  const filteredAllocations = useMemo(() => {
    if (!searchTerm) return allocations;
    const q = searchTerm.toLowerCase();
    return allocations.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.roomName.toLowerCase().includes(q) ||
        s.seatLabel.toLowerCase().includes(q) ||
        (s.enrollmentNumber && s.enrollmentNumber.toLowerCase().includes(q)) ||
        (s.rollNo != null && String(s.rollNo).includes(q))
    );
  }, [allocations, searchTerm]);

  // ── Print Summary Calculation ───────────────────────────────────
  const printSummaryRows = useMemo(() => {
    const roomGroups = allocations.reduce((acc, alloc) => {
      if (!acc[alloc.roomName]) {
        acc[alloc.roomName] = [];
      }
      acc[alloc.roomName].push(alloc);
      return acc;
    }, {} as Record<string, typeof allocations>);

    const rows = Object.entries(roomGroups).map(([roomName, allocs]) => {
      const rollNos = allocs.map(a => a.rollNo).filter(r => r != null).sort((a, b) => a - b);
      let rollRange = "ALL";
      let minRollNo = Infinity;

      if (rollNos.length > 0) {
        minRollNo = rollNos[0];

        if (rollNos.length === 1) {
          rollRange = String(rollNos[0]).padStart(2, '0');
        } else {
          rollRange = `${String(rollNos[0]).padStart(2, '0')} -\n${String(rollNos[rollNos.length - 1]).padStart(2, '0')}`;
        }
      }

      const roomInfo = availableRooms.find(r => r.roomName === roomName);

      return {
        batch: selectedExam?.academicYear || "-",
        programme: `${selectedSchedule?.className || ""} ${selectedSchedule?.sectionName ? `(${selectedSchedule.sectionName})` : ""}`.trim(),
        rollRange,
        minRollNo,
        count: allocs.length,
        room: roomName,
        area: "Main Campus",
        floor: roomInfo?.floorNumber != null ? `Floor ${roomInfo.floorNumber}` : "-"
      };
    });

    rows.sort((a, b) => {
      if (a.minRollNo !== Infinity && b.minRollNo !== Infinity) {
        return a.minRollNo - b.minRollNo;
      }
      return a.room.localeCompare(b.room);
    });

    return rows.map((r, index) => ({
      ...r,
      sno: index + 1
    }));
  }, [allocations, selectedSchedule, selectedExam, availableRooms]);

  // ── Seating Layout Engine ───────────────────────────────────────
  const currentMaxPerSeat = selectedSchedule?.maxStudentsPerSeat || 1;

  // ── Seat Check Table Grid Data ──────────────────────────────────
  const tableRoomGrids = useMemo(() => {
    if (roomUuidsForGrid.length === 0) return [];

    return roomUuidsForGrid.map((room) => {
      const seats = bulkGridData?.[room.uuid] ?? [];
      const roomInfo = availableRooms.find((r) => r.roomUuid === room.uuid);
      const isGridLoading = isBulkLoading;

      const mxRow = seats.length > 0 ? Math.max(...seats.map((s) => s.rowNumber)) : 0;
      const mxCol = seats.length > 0 ? Math.max(...seats.map((s) => s.columnNumber)) : 0;

      const seatMap: Record<string, (typeof seats)[0]> = {};
      seats.forEach((s) => {
        seatMap[`${s.rowNumber}-${s.columnNumber}`] = s;
      });

      const allocLookup: Record<string, SeatAllocationResponseDTO> = {};
      allocations
        .filter((a) => a.roomName === room.name)
        .forEach((a) => {
          allocLookup[`${a.rowNumber}-${a.columnNumber}-${a.positionIndex}`] = a;
        });

      const currentRoomAllocCount = allocations.filter(
        (a) => a.roomName === room.name
      ).length;

      return {
        roomName: room.name,
        roomUuid: room.uuid,
        floorNumber: roomInfo?.floorNumber ?? null,
        capacity: roomInfo?.totalSeats ?? 0,
        totalCapacity: roomInfo?.totalCapacity ?? 0,
        occupiedTotal: roomInfo?.occupiedCapacity ?? 0,
        seated: currentRoomAllocCount,
        maxPerSeat: roomInfo?.maxStudentsPerSeat ?? currentMaxPerSeat,
        mxRow,
        mxCol,
        seatMap,
        allocLookup,
        isGridLoading,
      };
    });
  }, [roomUuidsForGrid, bulkGridData, isBulkLoading, availableRooms, allocations, currentMaxPerSeat]);

  const totalStudents = availableRooms.length > 0 ? availableRooms[0].totalStudentsToSeat : (selectedSchedule?.totalStudents ?? 0);
  const seatedCount = allocations.length;
  const remainingToSeat = Math.max(0, totalStudents - seatedCount);

  const targetAutoFillRoom = availableRooms.find(r => r.roomUuid === autoFillRoomUuid);
  const willSeatCount = targetAutoFillRoom
    ? Math.min(remainingToSeat, targetAutoFillRoom.availableCapacity ?? (targetAutoFillRoom.availableSeats * currentMaxPerSeat))
    : 0;

  const maxRow = seatGrid.length > 0 ? Math.max(...seatGrid.map(s => s.rowNumber)) : 0;
  const maxCol = seatGrid.length > 0 ? Math.max(...seatGrid.map(s => s.columnNumber)) : 0;

  // ── Bulk selection helpers ──────────────────────────────────────
  const allFilteredSelected =
    filteredAllocations.length > 0 &&
    filteredAllocations.every((s) => selectedIds.has(s.allocationId));

  const someFilteredSelected =
    filteredAllocations.some((s) => selectedIds.has(s.allocationId)) && !allFilteredSelected;

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredAllocations.forEach((s) => next.delete(s.allocationId));
      } else {
        filteredAllocations.forEach((s) => next.add(s.allocationId));
      }
      return next;
    });
  }, [allFilteredSelected, filteredAllocations]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ── Handlers ────────────────────────────────────────────────────
  const handleExamChange = (uuid: string) => {
    setSelectedExamUuid(uuid);
    setSelectedClassUuid("");
    setSelectedScheduleId(0);
    setSearchTerm("");
    clearSelection();
  };

  const handleClassChange = (uuid: string) => {
    setSelectedClassUuid(uuid);
    setSelectedScheduleId(0);
    setSearchTerm("");
    clearSelection();
  };

  const handleScheduleChange = (id: string) => {
    setSelectedScheduleId(Number(id));
    setSearchTerm("");
    clearSelection();
  };

  const openAssign = () => {
    setFormStudentId("");
    setFormRoomUuid("");
    setFormSeatId(0);
    setAssignOpen(true);
  };

  const openAutoFill = () => {
    setAutoFillRoomUuid("");
    setAutoFillOpen(true);
  };

  const handleAssign = () => {
    if (!formStudentId || !formRoomUuid || formSeatId === 0) {
      toast.error("Please select a student, room, and a specific seat.");
      return;
    }
    assignSeatMutation.mutate(
      {
        examScheduleId: selectedScheduleId,
        studentId: formStudentId,
        roomId: formRoomUuid,
        seatId: formSeatId,
      },
      {
        onSuccess: () => {
          toast.success("Seat assigned layout verified.");
          setAssignOpen(false);
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message || err?.response?.data?.error || "Seat assignment failed";
          toast.error(msg);
        },
      }
    );
  };

  const handleAutoFill = () => {
    if (!autoFillRoomUuid) {
      toast.error("Please select a room first.");
      return;
    }
    autoFillMutation.mutate(
      {
        examScheduleId: selectedScheduleId,
        roomId: autoFillRoomUuid,
      },
      {
        onSuccess: (data) => {
          toast.success(`Successfully auto-allocated ${data.length} students safely.`);
          setAutoFillOpen(false);
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message || err?.response?.data?.error || "Auto-fill failed";
          toast.error(msg);
        },
      }
    );
  };

  const handleRemove = () => {
    if (!deleteTarget) return;
    removeMutation.mutate(
      { id: deleteTarget.allocationId, examScheduleId: selectedScheduleId },
      {
        onSuccess: () => {
          toast.success("Seat allocation history removed");
          setDeleteTarget(null);
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(deleteTarget.allocationId);
            return next;
          });
        },
        onError: () => toast.error("Failed to remove"),
      }
    );
  };

  const handleBulkRemove = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    bulkRemoveMutation.mutate(
      { ids, examScheduleId: selectedScheduleId },
      {
        onSuccess: () => {
          toast.success(`Dropped ${ids.length} block allocation${ids.length > 1 ? "s" : ""}`);
          setBulkDeleteOpen(false);
          clearSelection();
        },
        onError: () => toast.error("Failed to remove selected allocations"),
      }
    );
  };

  const selectedCount = selectedIds.size;

  const handlePrintPdf = useCallback(async () => {
    if (!selectedScheduleId) return;

    try {
      setIsPrintingPdf(true);
      const response = await examinationService.downloadSeatingPlanPdf(
        selectedScheduleId,
        "ROOM_WISE"
      );
      const url = window.URL.createObjectURL(new Blob([response.data as any]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `SeatingPlan_Schedule_${selectedScheduleId}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Seating plan PDF downloaded successfully.");
    } catch {
      toast.error("Failed to download seating plan PDF.");
    } finally {
      setIsPrintingPdf(false);
    }
  }, [selectedScheduleId]);

  // ── Format label for print grid ─────────────────────────────────


  return (
    <div className="space-y-5 relative overflow-hidden" id="printable-seating-plan">
      <style>{`
        @media print {
          @page { size: landscape; margin: 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:break-after-always { page-break-after: always; }
          .print\\:break-before-page { page-break-before: always; }
          table { border-collapse: collapse !important; }
          th, td { border: 1px solid black !important; padding: 4px 6px !important; }
        }
      `}</style>
      {/* ── Print Header (Only visible during print, hidden in seatcheck mode) ── */}
      <div className={`hidden ${viewMode !== "seatcheck" ? "print:block" : ""} w-full text-black font-serif bg-white`} style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        <div className="flex items-center justify-center gap-4 mb-2">
          <div className="w-16 h-16 flex items-center justify-center text-red-600 border border-red-600/30 rounded-full bg-red-50">
            <GraduationCap className="w-10 h-10" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-blue-900 leading-tight uppercase">Siksha Intelligence</h1>
            <h2 className="text-xl font-bold tracking-wider uppercase">Examination Department</h2>
            <h3 className="text-base font-semibold uppercase mt-1">
              End Term Examination {selectedExam?.academicYear ? `, ${selectedExam.academicYear}` : ""}
            </h3>
          </div>
        </div>

        <div className="bg-amber-400 py-1 border-y-2 border-black w-full text-center mt-2">
          <h2 className="text-lg font-bold uppercase tracking-widest text-black">Seating Plan</h2>
        </div>

        {selectedSchedule && (
          <div className="text-center py-2 text-md font-bold uppercase tracking-wider text-black">
            {selectedSchedule.subjectName} ( {selectedSchedule.startTime?.substring(0, 5)} - {selectedSchedule.endTime?.substring(0, 5)} )
          </div>
        )}

        <table className="w-full mt-4 text-sm border-collapse border border-black printable-table text-black">
          <thead>
            <tr className="bg-gray-100 border-b border-black">
              <th className="border border-black p-2 w-12 text-center text-black">S.No</th>
              <th className="border border-black p-2 w-20 text-center text-black">Batch</th>
              <th className="border border-black p-2 w-32 text-center text-black">Programme/<br />Branch</th>
              <th className="border border-black p-2 text-center text-black">Roll No Range</th>
              <th className="border border-black p-2 w-24 text-center text-black">No of<br />Students</th>
              <th className="border border-black p-2 w-28 text-center text-black">Room No.</th>
              <th className="border border-black p-2 w-24 text-center text-black">Floor</th>
              <th className="border border-black p-2 w-32 text-center text-black">Area</th>
            </tr>
          </thead>
          <tbody>
            {printSummaryRows.map((row) => (
              <tr key={row.sno} className="border-b border-black leading-tight">
                <td className="border border-black font-bold p-1.5 text-center text-black">{row.sno}</td>
                <td className="border border-black p-1.5 font-bold text-center text-black">{row.batch}</td>
                <td className="border border-black font-bold p-1.5 text-center text-black">{row.programme}</td>
                <td className="border border-black p-1.5 font-bold text-center text-black">{row.rollRange}</td>
                <td className="border border-black p-1.5 text-center font-bold text-black">{row.count}</td>
                <td className="border border-black p-1.5 text-center font-bold text-black">{row.room}</td>
                <td className="border border-black p-1.5 font-bold text-center text-black uppercase">{row.floor}</td>
                <td className="border border-black p-1.5 font-bold text-center text-black uppercase">{row.area}</td>
              </tr>
            ))}
            {printSummaryRows.length === 0 && (
              <tr>
                <td colSpan={8} className="border border-black p-4 text-center text-black italic">No allocations available for this schedule.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-8 pt-4 w-full flex justify-between text-xs font-bold border-t border-black px-4">
          <span>* Auto-generated by Siksha Intelligence Seating Engine</span>
          <span>Date Printed: {new Date().toLocaleDateString("en-IN")}</span>
        </div>
      </div>

      {/* Legacy Print Engine Removed -- Now utilizes visual spatial UI layout node */}

      {/* ── Floating Bulk Action Bar ─────────────────────────────── */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="sticky top-2 z-30 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-destructive/30 bg-destructive/5 backdrop-blur-md shadow-lg mb-4 print:hidden"
          >
            <CheckSquare className="w-4 h-4 text-destructive" />
            <span className="text-sm font-semibold text-destructive">
              {selectedCount} selected
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={clearSelection}
              >
                <XSquare className="w-3.5 h-3.5" />
                Clear
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Drop Selected Config
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-end gap-3 print:hidden bg-muted/20 p-2.5 rounded-xl border border-border/50">
        <div className="flex-1 min-w-[180px]">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Select Exam</label>
          <Select value={selectedExamUuid} onValueChange={handleExamChange}>
            <SelectTrigger id="seating-exam-select" className="h-8 text-xs bg-card">
              <SelectValue placeholder="Choose an exam…" />
            </SelectTrigger>
            <SelectContent>
              {exams.filter(e => e.published).map((e) => (
                <SelectItem key={e.uuid} value={e.uuid} className="text-xs">
                  {e.name} ({e.academicYear})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[120px]">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Select Class</label>
          <Select
            value={selectedClassUuid}
            onValueChange={handleClassChange}
            disabled={!selectedExamUuid || availableClasses.length === 0}
          >
            <SelectTrigger id="seating-class-select" className="h-8 text-xs bg-card">
              <SelectValue placeholder={availableClasses.length === 0 ? "No classes" : "Choose class…"} />
            </SelectTrigger>
            <SelectContent>
              {availableClasses.map((c) => (
                <SelectItem key={c.uuid} value={c.uuid} className="text-xs">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Select Schedule</label>
          <Select
            value={selectedScheduleId ? String(selectedScheduleId) : ""}
            onValueChange={handleScheduleChange}
            disabled={!selectedClassUuid || filteredSchedulesByClass.length === 0}
          >
            <SelectTrigger id="seating-schedule-select" className="h-8 text-xs bg-card">
              <SelectValue placeholder={filteredSchedulesByClass.length === 0 ? "No schedules" : "Choose schedule…"} />
            </SelectTrigger>
            <SelectContent>
              {filteredSchedulesByClass.map((s) => (
                <SelectItem key={s.scheduleId} value={String(s.scheduleId)} className="text-xs">
                  {s.subjectName}
                  {s.sectionName ? ` (${s.sectionName})` : ""} ·{" "}
                  {new Date(s.examDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search plan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs bg-card"
            disabled={!selectedScheduleId}
          />
        </div>

        <div className="flex items-center gap-2">
          {selectedExamUuid && (
            <>
              <Button
                onClick={() => setGlobalModalOpen(true)}
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0 h-8 text-xs border-indigo-500/20 hover:bg-indigo-500/10 text-indigo-600 bg-card"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Global Generate
              </Button>
              <Button
                onClick={() => window.open(seatAllocationService.getGlobalSeatingPlanPdfUrl(selectedExamUuid), "_blank")}
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0 h-8 text-xs bg-card hover:bg-muted"
              >
                <Printer className="w-3.5 h-3.5" />
                Global Plan
              </Button>
              <div className="w-px h-6 bg-border mx-1" />
            </>
          )}
          <Button
            onClick={handlePrintPdf}
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0 h-8 text-xs bg-card hover:bg-muted"
            disabled={isPrintingPdf || !selectedScheduleId || allocations.length === 0}
          >
            {isPrintingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Printer className="w-3.5 h-3.5" />
            )}
            Print
          </Button>
          <Button
            onClick={openAutoFill}
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0 h-8 text-xs border-primary/20 hover:bg-primary/5 text-primary bg-card"
            disabled={!selectedScheduleId}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Auto Fill
          </Button>
          <Button
            onClick={openAssign}
            size="sm"
            className="gap-1.5 shrink-0 h-8 text-xs shadow-sm hover:shadow-md transition-shadow"
            disabled={!selectedScheduleId}
          >
            <Plus className="w-3.5 h-3.5" />
            Assign Seat
          </Button>
        </div>
      </div>

      {/* ── Visual Layout vs Table Toggle ───────────────────────── */}
      {selectedScheduleId > 0 && (
        <div className="flex flex-col gap-4 print:hidden">
          <div className="flex items-center justify-between border-b pb-4 mt-2">
            <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
              <Button
                variant={viewMode === "admin" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("admin")}
                className="transition-all"
              >
                Table View
              </Button>
              <Button
                variant={viewMode === "seatcheck" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("seatcheck")}
                className="transition-all gap-1.5"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Seat Check
              </Button>
            </div>
            {viewMode === "seatcheck" && (
              <div className="flex flex-col text-sm font-semibold text-muted-foreground mr-4 text-right">
                <span>Legend: L = Left, M = Middle, R = Right | Format: [Roll (SUBJ)]</span>
                {currentMaxPerSeat > 1 && (
                  <span className="text-xs text-destructive font-medium">
                    Warning: Students from the same exam cannot share a bench
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Summary badges ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-3"
          >
            <Badge variant="secondary" className="gap-1.5 px-3 py-1">
              <Users className="w-3.5 h-3.5" />
              {seatedCount} / {totalStudents} Students Seated
            </Badge>
            <Badge variant="outline" className="gap-1.5 px-3 py-1 border-primary/20 text-primary bg-primary/5">
              <Armchair className="w-3.5 h-3.5" />
              Max Sharing: {currentMaxPerSeat}
              {currentMaxPerSeat > 1 && ` (Different exams only)`}
            </Badge>
            {selectedExam && (
              <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {selectedExam.name}
              </span>
            )}
          </motion.div>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────── */}
      {!selectedScheduleId ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] rounded-2xl border-2 border-dashed border-border/60 gap-3 text-center print:hidden">
          <div className="p-4 rounded-full bg-muted">
            <Armchair className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">Select an exam & schedule</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Choose an exam and schedule entry to view real-time safe seat mappings
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center min-h-[250px] print:hidden">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredAllocations.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[250px] rounded-2xl border-2 border-dashed border-border/60 gap-3 text-center print:hidden">
          <div className="p-4 rounded-full bg-muted">
            <Armchair className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">
            {searchTerm ? "No matching seats" : "No seating plan yet"}
          </p>
        </div>
      ) : (
        <>
          {viewMode === "admin" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border/60 overflow-hidden bg-card print:hidden"
            >
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all rows"
                        className="translate-y-[1px]"
                      />
                    </TableHead>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Time Block</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Seat Label</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredAllocations.map((alloc, idx) => {
                      const isSelected = selectedIds.has(alloc.allocationId);
                      return (
                        <motion.tr
                          key={alloc.allocationId}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`group cursor-pointer transition-colors ${isSelected ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-muted/30"
                            }`}
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest("button")) return;
                            toggleSelect(alloc.allocationId);
                          }}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelect(alloc.allocationId)}
                              aria-label={`Select ${alloc.studentName}`}
                              className="translate-y-[1px]"
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm font-mono">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 font-semibold text-xs">
                                {alloc.studentName.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium">{alloc.studentName}</span>
                                <span className="text-[10px] text-muted-foreground font-medium">Roll No: {alloc.rollNo ?? '-'}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {new Date(alloc.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{" "}
                              {new Date(alloc.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="gap-1 border-border/50 bg-secondary/50">
                              <DoorOpen className="w-3 h-3" />
                              {alloc.roomName}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-medium text-muted-foreground">{alloc.subjectName}</span>
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1 font-mono font-medium text-primary bg-primary/5 px-2 py-1 rounded">
                              <Armchair className="w-3.5 h-3.5" />
                              {alloc.seatLabel}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setDeleteTarget(alloc)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </motion.div>
          )}


          {viewMode === "seatcheck" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 print:space-y-0"
            >
              {tableRoomGrids.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[250px] rounded-2xl border-2 border-dashed border-border/60 gap-3 text-center">
                  <div className="p-4 rounded-full bg-muted">
                    <Armchair className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="font-semibold text-foreground">No rooms allocated yet</p>
                  <p className="text-sm text-muted-foreground">Use Auto Fill to allocate seats first</p>
                </div>
              ) : (
                tableRoomGrids.map((room, idx) => (
                  <div
                    key={room.roomUuid}
                    className="rounded-xl border border-border/60 overflow-hidden bg-card print:block print:w-full print:rounded-none print:border-2 print:border-black print:m-0 print:p-0"
                    style={{
                      pageBreakBefore: idx === 0 ? 'auto' : 'always',
                      breakBefore: idx === 0 ? 'auto' : 'page',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid'
                    }}
                  >
                    {/* Room Header */}
                    <div className="bg-primary/5 border-b border-primary/20 p-4 text-center print:bg-white print:border-b-2 print:border-black">
                      <h3 className="text-xl font-bold uppercase tracking-wider print:text-black print:text-2xl">
                        ROOM: {room.roomName}
                        {room.floorNumber != null ? ` — FLOOR: ${room.floorNumber}` : ""}
                      </h3>
                      <p className="text-sm font-semibold text-muted-foreground mt-1 print:text-black print:text-base print:font-bold">
                        {selectedSchedule?.subjectName?.toUpperCase()} | {room.seated} STUDENTS
                      </p>
                      <div className="text-xs font-medium mt-2 flex justify-center gap-6 text-muted-foreground print:text-black print:text-sm">
                        <span>Current Exam Seated: <strong className="text-foreground print:text-black">{room.seated}</strong></span>
                        <span>Total Seats: <strong className="text-foreground print:text-black">{room.capacity}</strong></span>
                        <span>Room Occupancy: <strong className="text-foreground print:text-black">{room.occupiedTotal}/{room.totalCapacity}</strong></span>
                      </div>
                      {/* Legend */}
                      <div className="flex justify-center gap-4 mt-3 text-xs print:text-black print:text-[10px] print:mt-1">
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-300 dark:bg-blue-900 dark:border-blue-700" />
                          Current Exam
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-300 dark:bg-amber-900 dark:border-amber-700" />
                          Other Exam (Blocked)
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-sm bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800" />
                          Available
                        </span>
                      </div>
                    </div>

                    {room.isGridLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span className="ml-2 text-sm text-muted-foreground">Loading seat grid…</span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto print:overflow-visible">
                        <table className="w-full text-sm border-collapse min-w-max print:text-black print:text-xs">
                          <thead>
                            <tr className="bg-muted/40 border-b print:bg-gray-100">
                              <th className="border border-border/50 p-2 w-14 text-center font-bold sticky left-0 bg-muted/60 z-10 print:static print:bg-gray-100 print:border-black print:text-black">Row</th>
                              {Array.from({ length: room.mxCol }, (_, i) => (
                                <th
                                  key={i}
                                  colSpan={room.maxPerSeat}
                                  className="border border-border/50 p-1.5 text-center font-bold text-xs print:border-black print:text-black"
                                >
                                  Bench {i + 1}
                                </th>
                              ))}
                            </tr>
                            {room.maxPerSeat > 1 && (
                              <tr className="bg-muted/20 border-b print:bg-white">
                                <th className="border border-border/50 p-1 sticky left-0 bg-muted/30 z-10 print:static print:bg-white print:border-black" />
                                {Array.from({ length: room.mxCol }).flatMap((_, benchIdx) =>
                                  Array.from({ length: room.maxPerSeat }, (__, posIdx) => (
                                    <th
                                      key={`${benchIdx}-${posIdx}`}
                                      className="border border-border/50 p-1 text-center text-[10px] font-bold text-muted-foreground w-20 print:border-black print:text-black"
                                    >
                                      {POSITION_LABELS[posIdx] || `P${posIdx}`}
                                    </th>
                                  ))
                                )}
                              </tr>
                            )}
                          </thead>
                          <tbody>
                            {Array.from({ length: room.mxRow }, (_, rowIdx) => {
                              const rowNum = rowIdx + 1;
                              return (
                                <tr key={rowNum} className="hover:bg-muted/10 transition-colors print:hover:bg-white">
                                  <td className="border border-border/50 p-2 text-center font-bold bg-muted/30 sticky left-0 z-10 print:static print:bg-white print:border-black print:text-black">
                                    Row {rowNum}
                                  </td>
                                  {Array.from({ length: room.mxCol }).flatMap((_, colIdx) => {
                                    const colNum = colIdx + 1;
                                    const seat = room.seatMap[`${rowNum}-${colNum}`];

                                    return Array.from({ length: room.maxPerSeat }, (__, posIdx) => {
                                      if (!seat) {
                                        return (
                                          <td
                                            key={`${colNum}-${posIdx}`}
                                            className="border border-border/50 p-1.5 text-center text-muted-foreground/30 text-xs print:border-black print:text-black/20"
                                          >
                                            —
                                          </td>
                                        );
                                      }

                                      const slot = seat.occupiedSlots?.find(
                                        (s) => s.positionIndex === posIdx
                                      );

                                      if (!slot) {
                                        return (
                                          <td
                                            key={`${colNum}-${posIdx}`}
                                            className="border border-border/50 p-1.5 text-center bg-green-50/50 dark:bg-green-950/20 print:bg-white print:border-black"
                                          >
                                            <span className="text-xs text-green-600/40 font-medium print:text-black/20">-</span>
                                          </td>
                                        );
                                      }

                                      const alloc = room.allocLookup[`${rowNum}-${colNum}-${posIdx}`];
                                      const isCurrentExam = !!alloc;
                                      const subjectAbbr = slot.subjectName
                                        .substring(0, 3)
                                        .toUpperCase();

                                      if (isCurrentExam) {
                                        const shortName = alloc.studentName?.split(" ")[0] ?? "";
                                        return (
                                          <td
                                            key={`${colNum}-${posIdx}`}
                                            className="border border-border/50 p-1 text-center bg-blue-50 dark:bg-blue-950/30 print:bg-white print:border-black"
                                          >
                                            <div className="flex flex-col items-center gap-[1px]">
                                              <span className="font-mono font-bold text-[13px] text-blue-800 dark:text-blue-300 print:text-black leading-none mt-1">
                                                {alloc.rollNo ?? "—"}
                                              </span>
                                              <span className="text-[10px] font-semibold text-blue-900/90 dark:text-blue-100/90 print:text-black leading-tight uppercase truncate max-w-[60px]">
                                                {shortName}
                                              </span>
                                              <span className="text-[8px] font-medium text-blue-600/90 dark:text-blue-400/90 print:text-black leading-none">
                                                {subjectAbbr} | {alloc.className}
                                              </span>
                                            </div>
                                          </td>
                                        );
                                      }

                                      // Other exam occupant
                                      const shortName = slot.studentName?.split(" ")[0] ?? "";
                                      return (
                                        <td
                                          key={`${colNum}-${posIdx}`}
                                          className="border border-border/50 p-1 text-center bg-amber-50 dark:bg-amber-950/30 print:bg-white print:border-black"
                                        >
                                          <TooltipProvider delayDuration={100}>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <div className="flex flex-col items-center gap-[1px] cursor-help">
                                                  <span className="font-mono font-bold text-[13px] text-amber-800 dark:text-amber-300 print:text-black leading-none mt-1">
                                                    🔒
                                                  </span>
                                                  <span className="text-[10px] font-semibold text-amber-900/90 dark:text-amber-100/90 print:text-black leading-tight uppercase truncate max-w-[60px]">
                                                    {shortName.length > 0 ? shortName : "BLOCKED"}
                                                  </span>
                                                  <span className="text-[8px] font-medium text-amber-700/90 dark:text-amber-400/90 print:text-black leading-none">
                                                    {subjectAbbr} | {slot.className}
                                                  </span>
                                                </div>
                                              </TooltipTrigger>
                                              <TooltipContent side="top" className="text-xs max-w-[220px]">
                                                <p className="font-semibold">🔒 Seat Reserved (Other Exam)</p>
                                                <p className="text-muted-foreground mt-1">{slot.studentName}</p>
                                                <p className="text-muted-foreground">
                                                  {slot.subjectName} ({slot.className})
                                                </p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </td>
                                      );
                                    });
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}
        </>
      )}

      {/* ── Assign Manual Dialog (With Visual Grid) ───────────────── */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Armchair className="w-5 h-5 text-primary" />
              Manual Seat Assignment
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5 border-r pr-4">
                <label className="text-sm font-medium">1. Select Student</label>
                <Select value={formStudentId} onValueChange={setFormStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[250px] overflow-y-auto">
                    {studentList.map((s) => (
                      <SelectItem key={s.uuid} value={s.uuid}>
                        {s.firstName} {s.lastName} {s.enrollmentNumber ? `(${s.enrollmentNumber})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <label className="text-sm font-medium mt-4">2. Select Target Room</label>
                {isLoadingRooms ? (
                  <div className="h-10 flex items-center text-sm text-muted-foreground"><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Loading capacities...</div>
                ) : (
                  <Select value={formRoomUuid} onValueChange={(r) => { setFormRoomUuid(r); setFormSeatId(0); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select available room" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                      {availableRooms.map((r) => {
                        const isTrulyFull = r.totalSeats > 0 && r.isFull;
                        if (isTrulyFull) return null;

                        return (
                          <SelectItem key={r.roomUuid} value={r.roomUuid} disabled={r.totalSeats === 0 || r.isFull}>
                            <div className="flex flex-col">
                              <span className="flex items-center gap-2">
                                {r.roomName}
                                {r.totalSeats === 0 ? (
                                  <Badge variant="destructive" className="text-[10px] ml-2 font-mono">
                                    No Seating Configured
                                  </Badge>
                                ) : (
                                  <div className="flex gap-2 items-center">
                                    <Badge variant={r.isFull ? "destructive" : "secondary"} className="text-[10px] ml-2 font-mono">
                                      {r.availableCapacity} / {r.totalCapacity} free
                                    </Badge>
                                    {r.mode && (
                                      <Badge variant={r.mode === "TRIPLE" ? "default" : "outline"} className="text-[10px] font-mono">
                                        {r.mode}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </span>
                              {r.occupiedBy && r.occupiedBy.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1 pl-1">
                                  {r.occupiedBy.map((o, idx) => (
                                    <span key={idx} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground whitespace-nowrap">
                                      {o.subjectName.substring(0, 3)} ({o.className}): {o.count}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
                <div className="mt-auto pt-4 text-xs space-y-2">
                  <div className="text-muted-foreground">
                    Time bounds are enforced automatically at the API layer based on schedule duration. You cannot double-book a seat.
                  </div>
                  <div className="text-destructive font-medium border-t pt-2">
                    ⚠ Warning: Students from the same exam cannot share a bench.
                  </div>
                </div>
              </div>

              {/* Grid System Area */}
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">3. Pick a physical seat</label>
                {!formRoomUuid ? (
                  <div className="h-[200px] bg-muted/30 rounded-xl flex items-center justify-center text-sm text-muted-foreground border border-dashed">
                    Select a room first
                  </div>
                ) : isLoadingGrid ? (
                  <div className="h-[200px] bg-muted/30 rounded-xl flex items-center justify-center text-sm text-muted-foreground border">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : (
                  <div className="p-4 bg-muted/20 border rounded-xl overflow-x-auto">
                    <div
                      className="grid gap-2 outline-none w-max mx-auto"
                      style={{
                        gridTemplateColumns: `repeat(${maxCol}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${maxRow}, minmax(0, 1fr))`
                      }}
                    >
                      <TooltipProvider delayDuration={200}>
                        {seatGrid.map((seat) => {
                          const isSelected = formSeatId === seat.seatId;
                          const seatCapacity = seat.capacity ?? currentMaxPerSeat;
                          const occupiedCount = seat.occupiedCount ?? 0;
                          const isFull = seat.isFull ?? (occupiedCount >= seatCapacity);
                          const isEmpty = occupiedCount === 0;
                          const isPartiallyFilled = occupiedCount > 0 && !isFull;

                          let bgClass = "bg-white dark:bg-zinc-800 border-border/80 text-foreground";
                          if (isSelected) {
                            bgClass = "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20 scale-105";
                          } else if (isFull) {
                            bgClass = "bg-red-50 text-red-700/60 border-red-200 cursor-not-allowed text-xs";
                          } else if (isPartiallyFilled) {
                            bgClass = "bg-amber-100 text-amber-800 border-amber-400 hover:border-primary/50 cursor-pointer shadow-inner";
                          } else if (isEmpty) {
                            bgClass = "bg-green-100/50 text-green-700 border-green-400 hover:border-primary/50 cursor-pointer shadow-sm";
                          }

                          // Build tooltip content from occupied slots
                          const slots = seat.occupiedSlots || [];
                          const tooltipLines = slots.map(s =>
                            `${POSITION_FULL_LABELS[s.positionIndex] || `POS ${s.positionIndex}`}: ${s.studentName} (${s.subjectName.substring(0, 3)} / ${s.className})`
                          );
                          // Add available slots info
                          for (let i = 0; i < seatCapacity; i++) {
                            if (!slots.find(s => s.positionIndex === i)) {
                              tooltipLines.push(`${POSITION_FULL_LABELS[i] || `POS ${i}`}: Available`);
                            }
                          }

                          return (
                            <Tooltip key={seat.seatId}>
                              <TooltipTrigger asChild>
                                <button
                                  disabled={isFull}
                                  onClick={() => setFormSeatId(seat.seatId)}
                                  className={`w-10 h-10 rounded-md flex flex-col items-center justify-center text-[10px] font-mono transition-all border-2 ${bgClass}`}
                                  style={{
                                    gridColumn: seat.columnNumber,
                                    gridRow: seat.rowNumber
                                  }}
                                >
                                  <span className="font-bold">{seat.label.split("-")[1]}</span>
                                  <span className={`text-[8px] leading-[8px] tracking-tighter ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground/80'}`}>
                                    {occupiedCount}/{seatCapacity}
                                  </span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs max-w-[250px]">
                                <p className="font-semibold mb-1">{seat.label} ({occupiedCount}/{seatCapacity})</p>
                                {tooltipLines.map((line, i) => (
                                  <p key={i} className={line.includes("Available") ? "text-green-600" : "text-muted-foreground"}>
                                    {line}
                                  </p>
                                ))}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </TooltipProvider>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t mt-2">
              <Button variant="ghost" onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button onClick={handleAssign} disabled={assignSeatMutation.isPending || !formSeatId}>
                {assignSeatMutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                Confirm Assignment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Auto-Fill Dialog ────────────────────────────────────── */}
      <Dialog open={autoFillOpen} onOpenChange={setAutoFillOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Sparkles className="w-5 h-5 text-primary" />
              Batch Auto-Allocate
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-2">
            <div className="bg-primary/5 rounded-lg p-4 space-y-3 border border-primary/10">
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" /> Queue Size:
                </span>
                <Badge variant="secondary">{remainingToSeat} students</Badge>
              </div>
              {targetAutoFillRoom && (
                <>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground font-medium flex items-center gap-2">
                      <DoorOpen className="w-4 h-4" /> Room Safety Limit:
                    </span>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-500/5">
                      {targetAutoFillRoom.availableCapacity} slots open
                    </Badge>
                  </div>
                  <div className="pt-2 border-t border-primary/10 mt-1">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Expected Insertion:</span>
                      <span className={willSeatCount < remainingToSeat ? 'text-amber-500' : 'text-green-600'}>
                        +{willSeatCount} transactions
                      </span>
                    </div>
                  </div>
                  {willSeatCount < remainingToSeat && (
                    <div className="text-[11px] text-amber-600 font-medium bg-amber-500/10 p-2 rounded border border-amber-500/20 mt-2 flex items-start gap-1">
                      <span className="text-xl leading-none -mt-1">⚠</span>
                      <span>Capacity deficit detected. You will need to run a secondary execution on another room to seat the final {remainingToSeat - willSeatCount} students.</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">
                Destination Pool <span className="text-destructive">*</span>
              </label>
              {isLoadingRooms ? (
                <div className="h-10 flex items-center text-sm text-muted-foreground border rounded-md px-3"><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Loading pools...</div>
              ) : (
                <Select value={autoFillRoomUuid} onValueChange={setAutoFillRoomUuid}>
                  <SelectTrigger className="h-11 shadow-sm">
                    <SelectValue placeholder="Select conflict-free room pool" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                    {availableRooms.map((r) => {
                      const isTrulyFull = r.totalSeats > 0 && r.isFull;
                      if (isTrulyFull) return null;

                      return (
                        <SelectItem key={r.roomUuid} value={r.roomUuid} disabled={r.totalSeats === 0 || r.isFull}>
                          <div className="flex flex-col text-left py-0.5">
                            <span className="font-medium flex items-center gap-2">
                              {r.roomName}
                              {r.totalSeats === 0 && <span className="text-[10px] uppercase text-destructive font-bold bg-destructive/10 px-1 rounded">No Config</span>}
                              {r.mode && r.totalSeats > 0 && (
                                <Badge variant={r.mode === "TRIPLE" ? "default" : "outline"} className="text-[9px] h-4 font-mono ml-auto">
                                  {r.mode}
                                </Badge>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground mt-0.5">
                              {r.totalSeats === 0 ? "Generate seats in infrastructure first" : `${r.occupiedCapacity} in-use • ${r.availableCapacity} available slots`}
                            </span>
                            {r.occupiedBy && r.occupiedBy.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {r.occupiedBy.map((o, idx) => (
                                  <span key={idx} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground whitespace-nowrap">
                                    {o.subjectName.substring(0, 3)} ({o.className}): {o.count}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t text-muted-foreground w-full">
              <span className="text-xs">Pessimistic locking prevents double-insertion.</span>
              <span className="text-[11px] text-destructive font-semibold">⚠ Warning: Capacity rules strictly follow "one exam per bench" sharing constraints.</span>
            </div>
            <Button variant="ghost" onClick={() => setAutoFillOpen(false)}>
              Abort
            </Button>
            <Button
              onClick={handleAutoFill}
              disabled={autoFillMutation.isPending || !autoFillRoomUuid}
              className="gap-1.5 min-w-[120px]"
            >
              {autoFillMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Single Confirmation ───────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Allocation Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{deleteTarget?.studentName}</strong> from seat{" "}
              <strong>{deleteTarget?.seatLabel}</strong> in{" "}
              <strong>{deleteTarget?.roomName}</strong>? This frees the grid space for other allocations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk Delete Confirmation ─────────────────────────────── */}
      <AlertDialog
        open={bulkDeleteOpen}
        onOpenChange={(o) => !o && setBulkDeleteOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Drop {selectedCount} Allocation Route{selectedCount > 1 ? "s" : ""}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                You are about to remove <strong>{selectedCount}</strong> configured seat allocation
                {selectedCount > 1 ? "s" : ""}. This makes all affected physical space available for reallocation.
              </span>
              <span className="block mt-2 text-xs bg-muted rounded-md p-2.5 max-h-[120px] overflow-y-auto leading-relaxed">
                {filteredAllocations
                  .filter((s) => selectedIds.has(s.allocationId))
                  .map((s) => `${s.studentName} → ${s.roomName} (${s.seatLabel})`)
                  .join(" · ")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
            >
              {bulkRemoveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Drop Configuration
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* ── Global Seating Modal ───────────────────────────────────── */}
      {selectedExamUuid && (
        <GlobalSeatingModal
          open={globalModalOpen}
          onOpenChange={setGlobalModalOpen}
          examUuid={selectedExamUuid}
          scheduleId={selectedScheduleId || undefined}
        />
      )}
    </div>
  );
}
