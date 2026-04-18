import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoomAttendanceQuery, useFinalizeAttendanceMutation } from '@/features/examination/hooks/useExamAttendanceQueries';
import { ExamAttendanceTable } from '@/features/examination/components/attendance/ExamAttendanceTable';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Lock, AlertTriangle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function RoomAttendancePage() {
    const { examScheduleId, roomId } = useParams<{ examScheduleId: string; roomId: string }>();
    const navigate = useNavigate();

    const [unmarkedCount, setUnmarkedCount] = useState<number>(0);
    const [hasPendingChanges, setHasPendingChanges] = useState<boolean>(false);
    const flushChangesRef = useRef<(() => Promise<void>) | null>(null);

    const scheduleId = Number(examScheduleId);
    const rId = Number(roomId);

    const { data: students, isLoading, isError } = useRoomAttendanceQuery(rId, scheduleId);
    const finalizeMutation = useFinalizeAttendanceMutation();

    const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);

    // Is there any student already correctly fetched?
    // We can assume the room is finalized if 'finalized' flag is true on the first student or via some metadata
    // Usually backend sends isFinalized on each student record
    const isFinalized = students && students.length > 0 ? students[0].finalized : false;

    const handlePendingChanges = (hasPending: boolean, flush: () => Promise<void>) => {
        setHasPendingChanges(hasPending);
        flushChangesRef.current = flush;
    };

    const attemptFinalize = () => {
        setIsFinalizeDialogOpen(true);
    };

    const confirmFinalize = async () => {
        // Force flush any pending marks before finalizing
        if (hasPendingChanges && flushChangesRef.current) {
            await flushChangesRef.current();
        }

        finalizeMutation.mutate({
            examScheduleId: scheduleId,
            roomId: rId
        }, {
            onSuccess: () => {
                setIsFinalizeDialogOpen(false);
            }
        });
    };

    if (isError) {
        return <div className="p-6 text-red-500 font-medium">Failed to load attendance roster.</div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/dashboard/invigilator/attendance')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight">Room Roster</h1>
                    <p className="text-muted-foreground">Mark attendance sequentially. Changes are saved automatically.</p>
                </div>
                {isFinalized ? (
                    <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-md border font-medium text-muted-foreground">
                        <Lock className="w-4 h-4" />
                        Finalized
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <div className="text-sm font-medium">
                            <span className="text-red-500 mr-2">{unmarkedCount} Unmarked</span>
                            <span className="text-muted-foreground">
                                Marked: {students ? students.length - unmarkedCount : 0} / {students?.length || 0}
                            </span>
                        </div>
                        <Button
                            variant="default"
                            className="bg-primary/90"
                            onClick={attemptFinalize}
                            disabled={!students || students.length === 0}
                        >
                            Finalize Attendance
                        </Button>
                    </div>
                )}
            </div>

            {isLoading ? (
                <Skeleton className="h-[400px] w-full" />
            ) : students && students.length > 0 ? (
                <ExamAttendanceTable
                    students={students}
                    examScheduleId={scheduleId}
                    roomId={rId}
                    isFinalized={isFinalized || false}
                    onPendingChangesChange={handlePendingChanges}
                    onUnmarkedCountChange={setUnmarkedCount}
                />
            ) : (
                <div className="text-center py-20 border rounded-lg bg-muted/20">
                    <h3 className="text-lg font-medium">No students allocated</h3>
                    <p className="text-sm text-muted-foreground">There are no students scheduled in this room.</p>
                </div>
            )}

            <Dialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            Finalize Attendance
                        </DialogTitle>
                        <DialogDescription className="pt-4 space-y-2 text-base text-foreground">
                            {unmarkedCount > 0 ? (
                                <>
                                    <p><strong>{unmarkedCount} students</strong> are still unmarked.</p>
                                    <p>If you proceed, these students will automatically be marked as <strong>ABSENT</strong>.</p>
                                </>
                            ) : (
                                <p>All students have been marked. Proceed with finalizing the attendance?</p>
                            )}
                            <p className="text-muted-foreground mt-4 text-sm">
                                Once finalized, you cannot revert or modify the attendance.
                            </p>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setIsFinalizeDialogOpen(false)} disabled={finalizeMutation.isPending}>
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={confirmFinalize}
                            disabled={finalizeMutation.isPending}
                        >
                            {finalizeMutation.isPending ? 'Finalizing...' : 'Confirm Finalize'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
