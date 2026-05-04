import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Sparkles,
  DoorOpen,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  Info,
  Users,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import type { RoomAvailabilityDTO, GlobalSeatAllocationResultDTO } from "@/services/types/seatAllocation";
import type { StaffSummaryDTO, PageResponse } from "@/services/admin";
import { seatAllocationService } from "@/services/seatAllocation";
import { invigilationService } from "@/services/invigilation";

interface RoomState {
  selected: boolean;
}

interface GlobalSeatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examUuid: string;
  /** A schedule ID for the first schedule in the exam to fetch rooms */
  scheduleId?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────
const capacityColor = (pct: number) => {
  if (pct >= 90) return "text-red-500";
  if (pct >= 60) return "text-amber-500";
  return "text-emerald-500";
};

const floorLabel = (n: number | null | undefined) =>
  n == null ? "–" : n === 0 ? "Ground" : `Floor ${n}`;

// ── Component ────────────────────────────────────────────────────────
export function GlobalSeatingModal({
  open,
  onOpenChange,
  examUuid,
  scheduleId,
}: GlobalSeatingModalProps) {
  const qc = useQueryClient();

  // ── Remote data ──────────────────────────────────────────────────

  // Fetch exam schedules so we can get rooms even without a pre-selected schedule
  const { data: examSchedules = [] } = useQuery<Array<{ scheduleId: number; subjectName: string }>>({
    queryKey: ["examination", "schedules", examUuid, "for-global-modal"],
    queryFn: async () =>
      (await api.get(`/auth/examination/exams/${examUuid}/schedules`)).data,
    enabled: open && !!examUuid,
    staleTime: 2 * 60 * 1000,
  });

  // Use the provided scheduleId (if user selected one) OR the first schedule from the exam
  const resolvedScheduleId = scheduleId || examSchedules[0]?.scheduleId;

  const { data: rooms = [], isLoading: roomsLoading } = useQuery<RoomAvailabilityDTO[]>({
    queryKey: ["seatAllocation", "rooms", resolvedScheduleId],
    queryFn: async () =>
      (await api.get("/auth/examination/seat-allocation/rooms", {
        params: { examScheduleId: resolvedScheduleId },
      })).data,
    enabled: open && !!resolvedScheduleId,
  });

  const { data: staffPage, isLoading: staffLoading } = useQuery<PageResponse<StaffSummaryDTO>>({
    queryKey: ["staff", "all-for-invigilation"],
    queryFn: async () =>
      (await api.get("/auth/admin/users/staff", { params: { size: 500 } })).data,
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const staffList = useMemo(() => staffPage?.content ?? [], [staffPage]);


  const { data: capacityInfo } = useQuery({
    queryKey: ["seatAllocation", "globalCapacity", examUuid],
    queryFn: async () => (await seatAllocationService.getGlobalCapacityInfo(examUuid)).data,
    enabled: open && !!examUuid,
  });

  const [poolStaffUuids, setPoolStaffUuids] = useState<string[]>([]);
  const [roomStates, setRoomStates] = useState<Record<string, RoomState>>({});
  const [result, setResult] = useState<GlobalSeatAllocationResultDTO | null>(null);
  const [isAssigningInvigilators, setIsAssigningInvigilators] = useState(false);

  // Initialise room state when rooms load
  const getRoomState = (uuid: string): RoomState =>
    roomStates[uuid] ?? { selected: true };

  const setRoomState = (uuid: string, patch: Partial<RoomState>) =>
    setRoomStates((prev) => ({
      ...prev,
      [uuid]: { ...getRoomState(uuid), ...patch },
    }));

  const toggleRoomSelected = (uuid: string) =>
    setRoomState(uuid, { selected: !getRoomState(uuid).selected });

  const selectAllRooms = () =>
    setRoomStates((prev) => {
      const next = { ...prev };
      rooms.forEach((r) => {
        const key = r.roomUuid.toString();
        next[key] = { ...getRoomState(key), selected: true };
      });
      return next;
    });

  const deselectAllRooms = () =>
    setRoomStates((prev) => {
      const next = { ...prev };
      rooms.forEach((r) => {
        const key = r.roomUuid.toString();
        next[key] = { ...getRoomState(key), selected: false };
      });
      return next;
    });



  // ── Mutations ─────────────────────────────────────────────────────
  const globalAllocateMutation = useMutation({
    mutationFn: (data: { examUuid: string; selectedRoomUuids: string[] }) =>
      seatAllocationService.globalAllocate(data).then((r) => r.data),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ["seatAllocation"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Global allocation failed");
    },
  });
  
  const clearAllocationsMutation = useMutation({
    mutationFn: () => seatAllocationService.clearAllocationsByExam(examUuid),
    onSuccess: () => {
      toast.success("All seat allocations for this exam have been cleared.");
      qc.invalidateQueries({ queryKey: ["seatAllocation"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to clear allocations");
    },
  });

  // ── Derived ───────────────────────────────────────────────────────
  const selectedRooms = rooms.filter((r) => getRoomState(r.roomUuid.toString()).selected);
  const allSelected = rooms.length > 0 && rooms.every((r) => getRoomState(r.roomUuid.toString()).selected);
  const someSelected = rooms.some((r) => getRoomState(r.roomUuid.toString()).selected);

  const totalSelectedCapacity = selectedRooms.reduce((s, r) => s + r.availableCapacity, 0);
  const totalStudentsForExam = capacityInfo?.maxStudentsInAnyTimeslot ?? 0;
  
  const capacityStatus = totalSelectedCapacity >= totalStudentsForExam ? "optimal" : 
                         totalSelectedCapacity >= totalStudentsForExam * 0.9 ? "warning" : "critical";

  // ── Handlers ──────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (selectedRooms.length === 0) {
      toast.error("Please select at least one room.");
      return;
    }

    toast.info("Running global seat allocation…");
    globalAllocateMutation.mutate({ 
      examUuid, 
      selectedRoomUuids: selectedRooms.map(r => r.roomUuid.toString()) 
    });
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearAll = () => {
    setShowClearConfirm(false);
    clearAllocationsMutation.mutate();
  };

  const handleAssignInvigilators = async () => {
    if (poolStaffUuids.length === 0) {
      toast.warning("Please select at least one invigilator for the pool.");
      return;
    }
    const selectedRoomUuids = selectedRooms.map(r => r.roomUuid.toString());
    if (selectedRoomUuids.length === 0) {
      toast.warning("Please select at least one room.");
      return;
    }

    setIsAssigningInvigilators(true);
    try {
      await invigilationService.bulkAssignPool({
        examUuid,
        selectedRoomUuids,
        poolStaffUuids,
      });
      toast.success("Invigilators assigned successfully.");
      qc.invalidateQueries({ queryKey: ["invigilations"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to assign invigilators.");
    } finally {
      setIsAssigningInvigilators(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onOpenChange(false);
  };

  // schedulesLoading is true when no scheduleId was given and we're auto-resolving
  const schedulesLoading = !scheduleId && examSchedules.length === 0;
  const isLoading = roomsLoading || staffLoading || schedulesLoading;

  const isPending = globalAllocateMutation.isPending || isAssigningInvigilators;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[780px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* ── Header ──────────────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="w-5 h-5 text-primary" />
            Global Seating Setup
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Select rooms and assign invigilators for the entire exam.
          </DialogDescription>
        </DialogHeader>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {result ? (
            /* ── Result view ──────────────────────────────────────── */
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
                <span className="font-semibold">Seating Plan Generated</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total Students", value: result.totalStudents, color: "text-foreground" },
                  { label: "Seated", value: result.totalSeated, color: "text-emerald-600" },
                  { label: "Unseated", value: result.totalUnseated, color: result.totalUnseated > 0 ? "text-red-500" : "text-muted-foreground" },
                  { label: "Rooms Used", value: result.roomsUsed, color: "text-indigo-600" },
                ].map((s) => (
                  <div key={s.label} className="p-3 rounded-xl border bg-muted/30 text-center">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {result.warnings?.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Warnings
                  </div>
                  <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc list-inside space-y-0.5">
                    {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button onClick={handleAssignInvigilators} disabled={isPending} variant="outline" className="flex-1 gap-2">
                  {isAssigningInvigilators ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  Save Invigilators
                </Button>
                <Button onClick={handleClose} className="flex-1">Done</Button>
              </div>
            </div>
          ) : (
            <>
              {/* ── Info bar ────────────────────────────────────────── */}
              {!isLoading && rooms.length > 0 && (
                <div className="px-5 py-2.5 bg-muted/30 border-b flex items-center gap-3 text-xs shrink-0">
                  <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    <strong>{rooms.length}</strong> rooms available for this exam. Select rooms to use for seating.
                  </span>
                  <div className="ml-auto flex gap-1.5">
                    <button
                      onClick={allSelected ? deselectAllRooms : selectAllRooms}
                      className="text-primary hover:underline font-medium"
                    >
                      {allSelected ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Global Invigilator Pool ────────────────────────────── */}
              <div className="px-5 py-3 border-b bg-background">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-primary" /> Global Invigilator Pool
                  </label>
                  <Badge variant="secondary">{poolStaffUuids.length} selected</Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-3">
                  Select staff to form a pool. The system will automatically cycle through the pool and assign primary and secondary invigilators to the selected rooms across all schedules in this exam.
                </div>
                <div className="max-h-32 overflow-y-auto border rounded-md p-2 bg-muted/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {staffList.map((staff) => (
                    <label key={staff.uuid} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 p-1.5 rounded">
                      <Checkbox
                        checked={poolStaffUuids.includes(staff.uuid)}
                        onCheckedChange={(c) => {
                          if (c) setPoolStaffUuids([...poolStaffUuids, staff.uuid]);
                          else setPoolStaffUuids(poolStaffUuids.filter(id => id !== staff.uuid));
                        }}
                      />
                      <span className="truncate">{staff.firstName} {staff.lastName} {staff.jobTitle ? `(${staff.jobTitle})` : ''}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ── Room list ─────────────────────────────────────────── */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-4 space-y-3">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading rooms & staff…
                    </div>
                  ) : rooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm gap-2">
                      <DoorOpen className="w-8 h-8 opacity-30" />
                      <p>No rooms available for this exam context.</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {rooms.map((room, idx) => {
                        const uuidStr = room.roomUuid.toString();
                        const state = getRoomState(uuidStr);
                        const pct = room.totalCapacity > 0
                          ? Math.round((room.occupiedCapacity / room.totalCapacity) * 100)
                          : 0;

                        return (
                          <motion.div
                            key={uuidStr}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className={`rounded-lg border transition-all duration-200 ${
                              state.selected
                                ? "border-primary/40 bg-primary/5 ring-1 ring-primary/10"
                                : "border-border/50 opacity-60 bg-muted/20"
                            }`}
                          >
                            {/* ── Room card header ──────────────────────────── */}
                            <div className="flex items-center gap-3 px-4 py-3">
                              <Checkbox 
                                id={`room-${uuidStr}`}
                                checked={state.selected}
                                onCheckedChange={() => toggleRoomSelected(uuidStr)}
                              />

                              <div className="w-9 h-9 rounded-lg bg-background border flex items-center justify-center shrink-0 shadow-sm">
                                <DoorOpen className={`w-4.5 h-4.5 ${state.selected ? "text-primary" : "text-muted-foreground"}`} />
                              </div>

                              <div className="flex-1 min-w-0">
                                <label 
                                  htmlFor={`room-${uuidStr}`}
                                  className="text-sm font-bold cursor-pointer block truncate"
                                >
                                  {room.roomName}
                                </label>
                                <div className="text-xs text-muted-foreground">
                                  {floorLabel(room.floorNumber)} · {room.mode ?? "–"}
                                </div>
                              </div>

                              <div className="hidden sm:flex items-center gap-2">
                                <Badge variant="secondary" className="gap-1 px-2 font-semibold text-[10px] uppercase tracking-wider">
                                  <Users className="w-3 h-3" />
                                  {room.availableCapacity} / {room.totalCapacity}
                                </Badge>
                                <span className={`text-[11px] font-bold ${capacityColor(pct)}`}>
                                  {pct}% used
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>
              </div>

              {/* ── Footer ────────────────────────────────────────────── */}
              {!isLoading && rooms.length > 0 && (
                <div className="px-6 py-4 border-t bg-muted/10 shrink-0 space-y-3">
                  {/* Status Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          capacityStatus === "optimal" ? "bg-emerald-500" : 
                          capacityStatus === "warning" ? "bg-amber-500" : "bg-red-500"
                        } animate-pulse`} />
                        <span className="text-xs font-bold">
                          {totalSelectedCapacity} / {totalStudentsForExam} seats allocated
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground ml-4">
                        {selectedRooms.length} rooms selected for {totalStudentsForExam} students
                      </div>
                    </div>

                    {capacityStatus !== "optimal" && (
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border ${
                        capacityStatus === "warning" 
                          ? "bg-amber-50 text-amber-700 border-amber-200" 
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}>
                        <ShieldAlert className="w-3.5 h-3.5" />
                        {capacityStatus === "warning" ? "Capacity Tight" : "Insufficient Capacity"}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <Button
                      variant="ghost"
                      onClick={() => setShowClearConfirm(true)}
                      disabled={isPending || clearAllocationsMutation.isPending}
                      className="h-10 text-destructive hover:text-destructive hover:bg-destructive/10 px-3"
                    >
                      {clearAllocationsMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      <span className="font-bold text-xs uppercase tracking-wider">Clear All</span>
                    </Button>

                    <div className="flex-1" />

                    <Button
                      variant="outline"
                      onClick={handleAssignInvigilators}
                      disabled={isPending || !someSelected}
                      className="h-10 px-4 font-bold text-xs uppercase tracking-wider gap-2"
                    >
                      {isAssigningInvigilators ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                      ) : (
                        <><UserCheck className="w-4 h-4" /> Save Invigilators</>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleClose}
                      disabled={isPending}
                      className="h-10 px-6 font-bold text-xs uppercase tracking-wider"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleGenerate}
                      disabled={isPending || !someSelected}
                      className="h-10 px-8 font-bold text-xs uppercase tracking-wider gap-2 min-w-[180px]"
                    >
                      {globalAllocateMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Generate Seating</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Confirmations ────────────────────────────────────────── */}
        <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear All Allocations?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete ALL seat allocations for this entire exam. 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Clear Everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
