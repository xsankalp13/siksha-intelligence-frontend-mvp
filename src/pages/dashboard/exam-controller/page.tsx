import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamControllerStore } from '@/features/examination/stores/examControllerStore';
import { useControllerDashboardQuery } from '@/features/examination/hooks/useExamControllerQueries';
import { useExamTimer } from '@/features/examination/hooks/useExamTimer';
import { useGetAllExams } from '@/features/examination/hooks/useExaminationQueries';
import { useAppSelector } from '@/store/hooks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, Users, DoorOpen, RotateCcw } from 'lucide-react';
import '@/features/examination/exam-controller.css';

export default function ExamControllerDashboardPage() {
  const navigate = useNavigate();
  const { selectedExamId, setSelectedExamId } = useExamControllerStore();
  const { data: allExams, isLoading: isExamsLoading } = useGetAllExams();
  const userRoles = useAppSelector((s) => s.auth.user?.roles || []);
  const isAdmin = userRoles.some(r => ['SUPER_ADMIN', 'ADMIN', 'SCHOOL_ADMIN'].includes(r));

  // Initialize selected exam if not set
  useEffect(() => {
    if (!selectedExamId && allExams && allExams.length > 0) {
      setSelectedExamId(allExams[0].id);
    }
  }, [selectedExamId, allExams, setSelectedExamId]);

  const { data: dashboard, isLoading: isDashboardLoading, isError, refetch, dataUpdatedAt } = useControllerDashboardQuery(selectedExamId);
  const { display: timerDisplay, status: timerStatus, remainingMs } = useExamTimer({
    startTime: dashboard?.timer.startTime,
    endTime: dashboard?.timer.endTime,
  });

  // Tweak #5: UI-level RBAC checks
  // A real check would look at the assigned list from the backend for the specific controller.
  // Assuming if we get a 403 from dashboard API, they aren't assigned. We handle read-only mode or empty state.
  const isAssigned = !isError; // Simplified: if query succeeds, they have access.

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Tweak #5 Read Only Warning */}
      {!isAdmin && isError && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded text-amber-800">
          <p className="font-medium">Read-Only Mode</p>
          <p className="text-sm">You are not assigned as a controller for this exam. Viewing in read-only mode.</p>
        </div>
      )}

      {/* Sticky Summary Bar */}
      <div className="controller-summary-bar">
        <div className="flex items-center gap-4">
          <div className="font-semibold text-lg flex items-center gap-2">
            <RadioIcon className="text-primary animate-pulse h-5 w-5" />
            Control Tower
          </div>
          {isExamsLoading ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <Select
              value={selectedExamId?.toString()}
              onValueChange={(val) => setSelectedExamId(Number(val))}
            >
              <SelectTrigger className="w-[250px] bg-background/50">
                <SelectValue placeholder="Select Exam..." />
              </SelectTrigger>
              <SelectContent>
                {allExams?.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id.toString()}>
                    {exam.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {dashboard && (
          <div className="flex items-center gap-8 mt-4 md:mt-0 text-sm font-medium">
            <div className="flex items-center gap-2">
              <DoorOpen className="text-muted-foreground h-4 w-4" />
              <span>{dashboard.rooms.length} Rooms</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="text-muted-foreground h-4 w-4" />
              <span>{dashboard.rooms.reduce((acc, r) => acc + r.allocatedStudents, 0)} Students</span>
            </div>
            <div className="flex items-center gap-2 text-primary bg-primary/10 px-3 py-1 rounded-full">
              <Clock className={`h-4 w-4 ${timerStatus === 'IN_PROGRESS' && remainingMs < 900000 ? 'text-red-500 animate-pulse' : ''}`} />
              <span className={timerStatus === 'IN_PROGRESS' && remainingMs < 900000 ? 'text-red-500 font-bold' : ''}>
                {timerDisplay}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Alert Banners */}
      {dashboard?.rooms.some(r => r.attendanceStatus === 'NOT_STARTED') && timerStatus === 'IN_PROGRESS' && (
        <div className="bg-red-50 text-red-800 p-3 rounded border border-red-200 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span><strong>Attention:</strong> {dashboard.rooms.filter(r => r.attendanceStatus === 'NOT_STARTED').length} rooms have not started attendance marking while the exam is in progress.</span>
        </div>
      )}

      {/* Main Content */}
      {isDashboardLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : isError ? (
        <div className="text-center py-20 bg-muted/20 rounded-xl border">
          <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground">Could not load dashboard data</p>
          <p className="text-muted-foreground mb-4">You may not be assigned to this exam or there is a network issue.</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RotateCcw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      ) : !dashboard?.rooms.length ? (
        <div className="text-center py-20 bg-muted/20 rounded-xl border">
          <p className="text-muted-foreground">No rooms found for this exam.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {dashboard.rooms.map((room) => {
            const isCompleted = room.attendanceStatus === 'COMPLETED';
            const isInProgress = room.attendanceStatus === 'IN_PROGRESS';
            
            return (
              <div key={room.roomId} className="room-card group">
                <div className="room-card-header">
                  <h3 className="font-semibold text-lg">{room.roomName}</h3>
                  <div className={`room-card-status-dot ${
                    isCompleted ? 'status-completed' : 
                    isInProgress ? 'status-in-progress' : 'status-not-started'
                  }`} title={room.attendanceStatus.replace('_', ' ')} />
                </div>
                
                <div className="space-y-4 flex-1">
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Attendance</span>
                    <span className="font-medium text-foreground">{room.markedStudents} / {room.allocatedStudents}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-primary'}`}
                      style={{ width: `${room.allocatedStudents > 0 ? (room.markedStudents / room.allocatedStudents) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <Button 
                    className="w-full" 
                    variant={isCompleted ? "secondary" : "default"}
                    onClick={() => navigate(`/dashboard/exam-controller/room/${room.roomId}`)}
                    disabled={!isAssigned && !isAdmin}
                  >
                    Open Room
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Last Updated */}
      <div className="text-xs text-muted-foreground text-center">
        {dataUpdatedAt ? `Last updated: ${Math.floor((Date.now() - dataUpdatedAt) / 1000)} seconds ago` : ''}
      </div>
    </div>
  );
}

function RadioIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="2" />
      <path d="M4.93 19.07a10 10 0 0 1 0-14.14" />
      <path d="M7.76 16.24a6 6 0 0 1 0-8.48" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.48" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}
