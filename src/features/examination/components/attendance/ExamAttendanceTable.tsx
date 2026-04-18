import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useMarkAttendanceMutation } from '@/features/examination/hooks/useExamAttendanceQueries';
import type { ExamRoomStudentResponseDTO, ExamAttendanceStatus, ExamAttendanceMarkEntryDTO } from '@/services/types/examAttendance';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ExamAttendanceTableProps {
    students: ExamRoomStudentResponseDTO[];
    examScheduleId: number;
    roomId: number;
    isFinalized: boolean;
    onPendingChangesChange?: (hasPending: boolean, flush: () => Promise<void>) => void;
    onUnmarkedCountChange?: (count: number) => void;
}

interface LocalState {
    status: ExamAttendanceStatus | null;
    dirty: boolean;
    isSaving: boolean;
}

export function ExamAttendanceTable({ 
    students, 
    examScheduleId, 
    roomId, 
    isFinalized,
    onPendingChangesChange,
    onUnmarkedCountChange
}: ExamAttendanceTableProps) {
    const markMutation = useMarkAttendanceMutation();
    const [localState, setLocalState] = useState<Record<number, LocalState>>({});
    const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>('IDLE');

    // Initialize local state from initial props
    useEffect(() => {
        const initialState: Record<number, LocalState> = {};
        let unmarkedCount = 0;
        students.forEach(s => {
            if (!s.status) unmarkedCount++;
            if (!localState[s.studentId]) {
                initialState[s.studentId] = {
                    status: s.status,
                    dirty: false,
                    isSaving: false
                };
            }
        });
        if (Object.keys(initialState).length > 0) {
            setLocalState(prev => ({ ...prev, ...initialState }));
        }
    }, [students]);

    // Recalculate unmarked count mapping from latest local state
    useEffect(() => {
        let count = 0;
        const keys = Object.keys(localState);
        if (keys.length === 0) return;
        
        keys.forEach(key => {
            if (!localState[Number(key)].status) count++;
        });
        onUnmarkedCountChange?.(count);
    }, [localState, onUnmarkedCountChange]);

    // Debounce flush implementation
    const flushChanges = useCallback(async () => {
        const entries: ExamAttendanceMarkEntryDTO[] = [];
        const studentIdsToMark: number[] = [];

        Object.entries(localState).forEach(([idStr, state]) => {
            if (state.dirty && state.status) {
                const studentId = Number(idStr);
                entries.push({ studentId, status: state.status });
                studentIdsToMark.push(studentId);
            }
        });

        if (entries.length === 0) return;

        setSaveStatus('SAVING');
        // Visually mark rows as saving
        setLocalState(prev => {
            const next = { ...prev };
            studentIdsToMark.forEach(id => {
                next[id] = { ...next[id], isSaving: true };
            });
            return next;
        });

        try {
            await markMutation.mutateAsync({
                examScheduleId,
                roomId,
                entries
            });

            // Mark as saved and not dirty
            setLocalState(prev => {
                const next = { ...prev };
                studentIdsToMark.forEach(id => {
                    next[id] = { ...next[id], dirty: false, isSaving: false };
                });
                return next;
            });
            setSaveStatus('SAVED');
            setTimeout(() => setSaveStatus('IDLE'), 2000);
        } catch (error) {
            setSaveStatus('ERROR');
            setLocalState(prev => {
                const next = { ...prev };
                studentIdsToMark.forEach(id => {
                    next[id] = { ...next[id], isSaving: false };
                });
                return next;
            });
            toast.error("Failed to auto-save. Please retry.");
        }
    }, [localState, examScheduleId, roomId, markMutation]);

    useEffect(() => {
        const hasDirty = Object.values(localState).some(s => s.dirty);
        onPendingChangesChange?.(hasDirty, flushChanges);

        if (!hasDirty) return;

        const timer = setTimeout(() => {
            flushChanges();
        }, 1500);

        return () => clearTimeout(timer);
    }, [localState, flushChanges, onPendingChangesChange]);

    const handleMark = (studentId: number, newStatus: ExamAttendanceStatus) => {
        if (isFinalized) return;
        
        setLocalState(prev => {
            const current = prev[studentId];
            if (current?.status === newStatus) return prev; // Click guard
            return {
                ...prev,
                [studentId]: {
                    status: newStatus,
                    dirty: true,
                    isSaving: false
                }
            };
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-card p-4 rounded-lg shadow-sm border">
                <div className="text-sm font-medium flex items-center gap-2">
                    Auto-Save Status: 
                    {saveStatus === 'SAVING' && <span className="text-blue-500 flex items-center"><Loader2 className="w-4 h-4 animate-spin mr-1"/> Saving...</span>}
                    {saveStatus === 'SAVED' && <span className="text-green-600 flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Saved ✔</span>}
                    {saveStatus === 'ERROR' && <span className="text-red-500">Error: Retry manually</span>}
                    {saveStatus === 'IDLE' && <span className="text-muted-foreground">Synced</span>}
                </div>
            </div>

            <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-muted/50 sticky top-0">
                        <tr>
                            <th className="px-6 py-3 font-medium">Seat</th>
                            <th className="px-6 py-3 font-medium">Roll No</th>
                            <th className="px-6 py-3 font-medium">Student Name</th>
                            <th className="px-6 py-3 font-medium">Class</th>
                            <th className="px-6 py-3 font-medium text-center">Status Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y bg-card">
                        {students.map((student) => {
                            const state = localState[student.studentId] || { status: student.status, dirty: false, isSaving: false };
                            const status = state.status;
                            const isRowSaving = state.isSaving;

                            return (
                                <tr key={student.studentId} className={cn("transition-colors", isRowSaving && "opacity-60")}>
                                    <td className="px-6 py-4 font-medium">{student.seatLabel || '-'}</td>
                                    <td className="px-6 py-4">{student.rollNo || '-'}</td>
                                    <td className="px-6 py-4">{student.name}</td>
                                    <td className="px-6 py-4">{student.className}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center space-x-2">
                                            <Button
                                                size="sm"
                                                variant={status === 'PRESENT' ? 'default' : 'outline'}
                                                className={cn("w-12", status === 'PRESENT' && "bg-green-600 hover:bg-green-700")}
                                                disabled={isFinalized}
                                                onClick={() => handleMark(student.studentId, 'PRESENT')}
                                            >
                                                P
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={status === 'ABSENT' ? 'default' : 'outline'}
                                                className={cn("w-12", status === 'ABSENT' && "bg-red-600 hover:bg-red-700")}
                                                disabled={isFinalized}
                                                onClick={() => handleMark(student.studentId, 'ABSENT')}
                                            >
                                                A
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={status === 'MALPRACTICE' ? 'default' : 'outline'}
                                                className={cn("w-12", status === 'MALPRACTICE' && "bg-yellow-600 hover:bg-yellow-700 text-white")}
                                                disabled={isFinalized}
                                                onClick={() => handleMark(student.studentId, 'MALPRACTICE')}
                                            >
                                                M
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
