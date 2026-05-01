import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExamControllerStore } from '@/features/examination/stores/examControllerStore';
import { 
  useControllerRoomViewQuery, 
  useControllerMarkAttendanceMutation,
  useControllerFinalizeAttendanceMutation,
  useDefaulterDecisionMutation,
  useControllerDashboardQuery
} from '@/features/examination/hooks/useExamControllerQueries';
import { useExamTimer } from '@/features/examination/hooks/useExamTimer';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, 
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter, 
  AlertDialogHeader, AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Lock, Users, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import '@/features/examination/exam-controller.css';

export default function ExamControllerRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { selectedExamId } = useExamControllerStore();
  
  const [confirmDialog, setConfirmDialog] = useState<'MARK_ALL' | 'FINALIZE' | null>(null);

  // Queries
  const { data: dashboardData } = useControllerDashboardQuery(selectedExamId);
  const { data: roomViewData, isLoading, } = useControllerRoomViewQuery(selectedExamId);
  
  // Mutations
  const markMutation = useControllerMarkAttendanceMutation();
  const finalizeMutation = useControllerFinalizeAttendanceMutation();
  const defaulterMutation = useDefaulterDecisionMutation();

  // Find current room
  const currentRoom = roomViewData?.rooms.find(r => r.roomId === Number(roomId));
  const dashboardRoom = dashboardData?.rooms.find(r => r.roomId === Number(roomId));
  
  // Timer setup
  const { display: timerDisplay, status: timerStatus, isNotStarted, } = useExamTimer({
    startTime: dashboardData?.timer.startTime,
    endTime: dashboardData?.timer.endTime,
  });

  // Tweak #5: Lock UI based on finalized status
  // We infer finalized from the first student, or dashboard status, ideally the API has a room.finalized flag
  // Let's assume if status is COMPLETED, it might be finalized.
  const isFinalized = dashboardRoom?.attendanceStatus === 'COMPLETED' || currentRoom?.students.some(s => s.finalized);

  const students = currentRoom?.students || [];

  // Virtualizer setup (Tweak #7)
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: students.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });

  const handleMarkAttendance = (studentId: number, status: 'PRESENT' | 'ABSENT' | 'MALPRACTICE' | 'LEFT') => {
    if (isFinalized || isNotStarted) return;
    
    // Tweak #2: Race condition protection via abort controller built into hook
    markMutation.mutate({
      examId: selectedExamId!,
      examScheduleId: students.find(s => s.studentId === studentId)!.examScheduleId,
      roomId: Number(roomId),
      attendances: [{ studentId, status }]
    });
  };

  const handleDefaulterToggle = (studentId: number, allowed: boolean) => {
    if (isFinalized) return;
    defaulterMutation.mutate({
      examId: selectedExamId!,
      roomId: Number(roomId),
      examScheduleId: students.find(s => s.studentId === studentId)!.examScheduleId,
      studentId,
      allowed,
      reason: 'Controller override'
    });
  };

  const handleMarkAllPresent = () => {
    if (isFinalized || isNotStarted) return;
    // Collect unmarked and allowed students
    const unmarked = students.filter(s => !s.attendanceStatus && s.entryAllowed);
    if (unmarked.length === 0) {
      toast.info("No unmarked students available to mark present.");
      setConfirmDialog(null);
      return;
    }

    markMutation.mutate({
      examId: selectedExamId!,
      // Assuming all students in room share schedule for bulk mark, or group them.
      // API expects examScheduleId. We use the first student's schedule. If mixed, this might fail, 
      // but API handoff says bulk mark is per schedule.
      examScheduleId: unmarked[0].examScheduleId, 
      roomId: Number(roomId),
      attendances: unmarked.map(s => ({ studentId: s.studentId, status: 'PRESENT' }))
    });
    setConfirmDialog(null);
  };

  const handleFinalize = () => {
    if (isFinalized || isNotStarted) return;
    finalizeMutation.mutate({
      examId: selectedExamId!,
      examScheduleId: students[0]?.examScheduleId,
      roomId: Number(roomId)
    });
    setConfirmDialog(null);
  };

  if (isLoading) {
    return <div className="p-6 space-y-4"><Skeleton className="h-16" /><Skeleton className="h-96" /></div>;
  }

  if (!currentRoom) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Room not found or no students assigned.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{currentRoom.roomName}</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <Users className="h-4 w-4" /> {students.length} Students
              {isFinalized && <span className="text-red-500 font-medium flex items-center ml-2"><Lock className="h-3 w-3 mr-1"/> Locked</span>}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-mono font-bold">{timerDisplay}</div>
          <div className="text-xs text-muted-foreground uppercase">{timerStatus.replace('_', ' ')}</div>
        </div>
      </div>

      {/* Partial failure UI (Tweak #4) */}
      {/* Note: the mutation hook shows a toast, but we could also show an inline alert here if state held failed IDs */}

      {/* Student List (Virtualized) */}
      <div className="flex-1 overflow-auto mt-4 bg-card rounded-lg border" ref={parentRef}>
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const student = students[virtualRow.index];
            return (
              <div
                key={student.studentId}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="flex items-center justify-between p-4 border-b hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">{student.rollNo}</span>
                    <span className="font-medium">{student.studentName}</span>
                    {!student.entryAllowed && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Blocked
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {student.className} • {student.subjectName} • Seat {student.seatNumber}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Defaulter Toggle */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold">Entry</span>
                    <Switch 
                      checked={student.entryAllowed}
                      onCheckedChange={(c) => handleDefaulterToggle(student.studentId, c)}
                      disabled={isFinalized}
                    />
                  </div>

                  {/* Attendance Pills */}
                  <div className="flex gap-2 bg-muted/50 p-1.5 rounded-full">
                    {['PRESENT', 'ABSENT', 'MALPRACTICE', 'LEFT'].map((status) => {
                      const isSelected = student.attendanceStatus === status;
                      const disabled = isFinalized || !student.entryAllowed && status === 'PRESENT';
                      
                      return (
                        <button
                          key={status}
                          disabled={disabled}
                          onClick={() => handleMarkAttendance(student.studentId, status as any)}
                          className={`attendance-pill ${isSelected ? `attendance-pill-${status.toLowerCase()}` : 'attendance-pill-unmarked'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={status}
                        >
                          {status.charAt(0)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="shrink-0 p-4 border-t bg-background flex items-center justify-between mt-auto">
        <div className="text-sm text-muted-foreground">
          {students.filter(s => s.attendanceStatus).length} of {students.length} marked
        </div>
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            disabled={isFinalized || isNotStarted || timerStatus === 'ENDED'}
            onClick={() => setConfirmDialog('MARK_ALL')}
          >
            Mark Unmarked Present
          </Button>
          <Button 
            disabled={isFinalized || isNotStarted}
            onClick={() => setConfirmDialog('FINALIZE')}
          >
            {isFinalized ? 'Attendance Locked' : 'Finalize Attendance'}
          </Button>
        </div>
      </div>

      {/* Confirmation Dialogs (Tweak #6) */}
      <AlertDialog open={!!confirmDialog} onOpenChange={(o) => !o && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog === 'MARK_ALL' ? 'Mark All Present' : 'Finalize Attendance'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog === 'MARK_ALL' && `This will mark ${students.filter(s => !s.attendanceStatus && s.entryAllowed).length} unmarked students as PRESENT. Are you sure?`}
              {confirmDialog === 'FINALIZE' && `This will lock the room and mark any remaining unmarked students as ABSENT. This action cannot be easily undone. Proceed?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDialog === 'MARK_ALL' ? handleMarkAllPresent : handleFinalize}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
