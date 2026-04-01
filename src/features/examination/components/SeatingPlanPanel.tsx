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
  useGetAllocationsForSchedule,
  useGetAvailableRooms,
  useGetSeatGrid,
  useAllocateSingleSeat,
  useAutoAllocateSeatsBulk,
  useRemoveAllocation,
  useBulkRemoveAllocations,
} from "../hooks/useSeatAllocationQueries";
import { useGetAllExams, useGetSchedulesByExam } from "../hooks/useExaminationQueries";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { ExamResponseDTO } from "@/services/types/examination";
import type { SeatAllocationResponseDTO } from "@/services/types/seatAllocation";
import { toast } from "sonner";

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
  const [selectedScheduleId, setSelectedScheduleId] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");

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

  const filteredAllocations = useMemo(() => {
    if (!searchTerm) return allocations;
    const q = searchTerm.toLowerCase();
    return allocations.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.roomName.toLowerCase().includes(q) ||
        s.seatLabel.toLowerCase().includes(q) ||
        s.enrollmentNumber?.toLowerCase().includes(q)
    );
  }, [allocations, searchTerm]);

  const totalStudents = availableRooms.length > 0 ? availableRooms[0].totalStudentsToSeat : (selectedSchedule?.totalStudents ?? 0);
  const seatedCount = allocations.length;
  const remainingToSeat = Math.max(0, totalStudents - seatedCount);

  const targetAutoFillRoom = availableRooms.find(r => r.roomUuid === autoFillRoomUuid);
  const willSeatCount = targetAutoFillRoom 
    ? Math.min(remainingToSeat, targetAutoFillRoom.availableSeats) 
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
          toast.error(err.response?.data?.message || "Failed to assign seat. Time conflict detected.");
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
          toast.error(err.response?.data?.message || "Failed to auto-allocate students.");
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

  return (
    <div className="space-y-5 relative">
      {/* ── Floating Bulk Action Bar ─────────────────────────────── */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="sticky top-2 z-30 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-destructive/30 bg-destructive/5 backdrop-blur-md shadow-lg mb-4"
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

      {/* ── Selectors Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="grid gap-1.5">
          <label className="text-sm font-medium text-muted-foreground">Select Exam</label>
          <Select value={selectedExamUuid} onValueChange={handleExamChange}>
            <SelectTrigger id="seating-exam-select">
              <SelectValue placeholder="Choose an exam…" />
            </SelectTrigger>
            <SelectContent>
              {exams.filter(e => e.published).map((e) => (
                <SelectItem key={e.uuid} value={e.uuid}>
                  {e.name} ({e.academicYear})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <label className="text-sm font-medium text-muted-foreground">Select Schedule</label>
          <Select
            value={selectedScheduleId ? String(selectedScheduleId) : ""}
            onValueChange={handleScheduleChange}
            disabled={!selectedExamUuid || schedules.length === 0}
          >
            <SelectTrigger id="seating-schedule-select">
              <SelectValue placeholder={schedules.length === 0 ? "No schedules" : "Choose schedule…"} />
            </SelectTrigger>
            <SelectContent>
              {schedules.map((s) => (
                <SelectItem key={s.scheduleId} value={String(s.scheduleId)}>
                  {s.subjectName} — {s.className}
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

        <div className="grid gap-1.5">
          <label className="text-sm font-medium text-muted-foreground">Actions</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search plan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                disabled={!selectedScheduleId}
              />
            </div>
            <Button
              onClick={openAutoFill}
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0 h-9 border-primary/20 hover:bg-primary/5 text-primary"
              disabled={!selectedScheduleId}
            >
              <Sparkles className="w-4 h-4" />
              Auto Fill
            </Button>
            <Button
              onClick={openAssign}
              size="sm"
              className="gap-1.5 shrink-0 h-9"
              disabled={!selectedScheduleId}
            >
              <Plus className="w-4 h-4" />
              Assign Seat
            </Button>
          </div>
        </div>
      </div>

      {/* ── Summary badges ──────────────────────────────────────── */}
      {selectedScheduleId > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3"
        >
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <Users className="w-3.5 h-3.5" />
            {seatedCount} / {totalStudents} Students Seated
          </Badge>
          {selectedExam && (
            <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {selectedExam.name}
            </span>
          )}
        </motion.div>
      )}

      {/* ── Content ─────────────────────────────────────────────── */}
      {!selectedScheduleId ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] rounded-2xl border-2 border-dashed border-border/60 gap-3 text-center">
          <div className="p-4 rounded-full bg-muted">
            <Armchair className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">Select an exam & schedule</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Choose an exam and schedule entry to view real-time safe seat mappings
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center min-h-[250px]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredAllocations.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[250px] rounded-2xl border-2 border-dashed border-border/60 gap-3 text-center">
          <div className="p-4 rounded-full bg-muted">
            <Armchair className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">
            {searchTerm ? "No matching seats" : "No seating plan yet"}
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/60 overflow-hidden bg-card"
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
                <TableHead>Seat Label</TableHead>
                <TableHead className="text-right">Coord</TableHead>
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
                      className={`group cursor-pointer transition-colors ${
                        isSelected ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-muted/30"
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
                            <span className="text-[10px] text-muted-foreground">{alloc.enrollmentNumber}</span>
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
                        <span className="flex items-center gap-1 font-mono font-medium text-primary bg-primary/5 px-2 py-1 rounded">
                          <Armchair className="w-3.5 h-3.5" />
                          {alloc.seatLabel}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        (R{alloc.rowNumber}-C{alloc.columnNumber})
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
                  <div className="h-10 flex items-center text-sm text-muted-foreground"><Loader2 className="w-3 h-3 mr-2 animate-spin"/> Loading capacities...</div>
                ) : (
                  <Select value={formRoomUuid} onValueChange={(r) => { setFormRoomUuid(r); setFormSeatId(0); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select available room" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                      {availableRooms.map((r) => {
                        // Truly full = has seats but all are occupied.
                        // Uninitialized = totalSeats is 0.
                        const isTrulyFull = r.totalSeats > 0 && r.isFull;
                        if (isTrulyFull) return null; // Don't render full rooms per user request
                        
                        return (
                          <SelectItem key={r.roomUuid} value={r.roomUuid} disabled={r.totalSeats === 0 || r.isFull}>
                            <span className="flex items-center gap-2">
                              {r.roomName} 
                              {r.totalSeats === 0 ? (
                                <Badge variant="destructive" className="text-[10px] ml-2 font-mono">
                                  No Seating Configured
                                </Badge>
                              ) : (
                                <Badge variant={r.isFull ? "destructive" : "secondary"} className="text-[10px] ml-2 font-mono">
                                  {r.availableSeats} / {r.totalSeats} free
                                </Badge>
                              )}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
                <div className="mt-auto pt-4 text-xs text-muted-foreground">
                  Time bounds are enforced automatically at the API layer based on schedule duration. You cannot double-book a seat.
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
                    <Loader2 className="w-5 h-5 animate-spin"/>
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
                      {seatGrid.map((seat) => {
                        const isSelected = formSeatId === seat.seatId;
                        return (
                          <button
                            key={seat.seatId}
                            disabled={!seat.available}
                            onClick={() => setFormSeatId(seat.seatId)}
                            title={seat.available ? seat.label : "Occupied - time conflict"}
                            className={`w-9 h-9 rounded-md flex items-center justify-center text-[10px] font-mono transition-all
                              ${seat.available && !isSelected ? "bg-white dark:bg-zinc-800 border-2 border-border/80 hover:border-primary/50 text-foreground cursor-pointer" : ""}
                              ${isSelected ? "bg-primary text-primary-foreground border-2 border-primary shadow-sm ring-2 ring-primary/20 scale-105" : ""}
                              ${!seat.available ? "bg-muted text-muted-foreground/30 border border-muted-foreground/10 cursor-not-allowed cursor-crosshair" : ""}
                            `}
                            style={{
                              gridColumn: seat.columnNumber,
                              gridRow: seat.rowNumber
                            }}
                          >
                            {seat.label.split("-")[1]}
                          </button>
                        );
                      })}
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
                      {targetAutoFillRoom.availableSeats} seats open
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
                <div className="h-10 flex items-center text-sm text-muted-foreground border rounded-md px-3"><Loader2 className="w-3 h-3 mr-2 animate-spin"/> Loading pools...</div>
              ) : (
                <Select value={autoFillRoomUuid} onValueChange={setAutoFillRoomUuid}>
                  <SelectTrigger className="h-11 shadow-sm">
                    <SelectValue placeholder="Select conflict-free room pool" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-[200px] overflow-y-auto">
                    {availableRooms.map((r) => {
                        const isTrulyFull = r.totalSeats > 0 && r.isFull;
                        if (isTrulyFull) return null; // Hide truly full rooms
                        
                        return (
                          <SelectItem key={r.roomUuid} value={r.roomUuid} disabled={r.totalSeats === 0 || r.isFull}>
                            <div className="flex flex-col text-left py-0.5">
                              <span className="font-medium flex items-center gap-2">
                                {r.roomName}
                                {r.totalSeats === 0 && <span className="text-[10px] uppercase text-destructive font-bold bg-destructive/10 px-1 rounded">No Config</span>}
                              </span>
                              <span className="text-xs text-muted-foreground mt-0.5">
                                {r.totalSeats === 0 ? "Generate seats in infrastructure first" : `${r.occupiedSeats} in-use • ${r.availableSeats} available block`}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t text-muted-foreground">
               <span className="text-xs flex-1 my-auto">Pessimistic locking prevents double-insertion.</span>
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
                Execute Sync
              </Button>
            </div>
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
    </div>
  );
}
