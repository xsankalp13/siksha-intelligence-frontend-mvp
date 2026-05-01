import { useState, useEffect, useCallback } from 'react';
import { useMarkAttendanceMutation } from '@/features/examination/hooks/useExamAttendanceQueries';
import type { ExamRoomStudentResponseDTO, ExamAttendanceStatus, ExamAttendanceMarkEntryDTO } from '@/services/types/examAttendance';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
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
    malpractice: boolean;
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
            if (!s.attendanceStatus) unmarkedCount++;
            if (!localState[s.studentId]) {
                initialState[s.studentId] = {
                    status: s.attendanceStatus,
                    malpractice: s.malpractice || false,
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
                entries.push({ studentId, status: state.status, malpractice: state.malpractice });
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
                attendances: entries
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

    const handleMark = (studentId: number, newStatus: ExamAttendanceStatus, newMalpractice: boolean = false) => {
        if (isFinalized) return;
        
        setLocalState(prev => {
            const current = prev[studentId];
            if (current?.status === newStatus && current?.malpractice === newMalpractice) return prev; // Click guard: identical status
            return {
                ...prev,
                [studentId]: {
                    status: newStatus,
                    malpractice: newMalpractice,
                    dirty: true,
                    isSaving: false
                }
            };
        });
    };

    const renderActionButtons = (studentId: number, status: ExamAttendanceStatus | null, malpractice: boolean, isRowDisabled: boolean) => (
        <>
            <button
                onClick={() => handleMark(studentId, status === 'PRESENT' ? 'ABSENT' : 'PRESENT', malpractice && status === 'PRESENT' ? false : malpractice)}
                disabled={isRowDisabled}
                className={cn(
                    "flex-1 md:flex-none flex justify-center items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold transition-colors text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
                    status === 'PRESENT' ? "bg-emerald-500 hover:bg-emerald-600 text-white ring-emerald-300" : 
                    status === 'ABSENT' ? "bg-red-500 hover:bg-red-600 text-white ring-red-300" : 
                    "bg-slate-100 hover:bg-slate-200 text-slate-500 border border-slate-200"
                )}
            >
                {status === 'PRESENT' ? <CheckCircle2 className="w-3.5 h-3.5" /> : 
                 status === 'ABSENT' ? <XCircle className="w-3.5 h-3.5" /> : 
                 <CheckCircle2 className="w-3.5 h-3.5 opacity-40" />}
                {status === 'PRESENT' ? 'Present' : 
                 status === 'ABSENT' ? 'Absent' : 
                 'Not Marked'}
            </button>

            <button
                onClick={() => handleMark(studentId, status !== 'ABSENT' ? (status || 'PRESENT') : 'PRESENT', !malpractice)}
                disabled={isRowDisabled}
                className={cn(
                    "flex-1 md:flex-none flex justify-center items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold transition-colors text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
                    malpractice ? "bg-amber-500 hover:bg-amber-600 text-white ring-amber-300" : 
                    "bg-transparent hover:bg-slate-100 text-slate-400 border border-transparent hover:border-slate-200"
                )}
                title="Report Malpractice"
            >
                <AlertTriangle className="w-3.5 h-3.5" />
                Malpractice
            </button>
        </>
    );

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

            {/* Mobile View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
                {students.map((student) => {
                    const state = localState[student.studentId] || { status: student.attendanceStatus, malpractice: student.malpractice || false, dirty: false, isSaving: false };
                    const status = state.status;
                    const malpractice = state.malpractice;
                    const isRowSaving = state.isSaving;
                    const isRowDisabled = isFinalized;

                    return (
                        <div key={student.studentId} className={cn("p-4 bg-card border rounded-xl shadow-sm relative overflow-hidden transition-opacity flex flex-col gap-3", isRowSaving && "opacity-60")}>
                            <div className="flex justify-between items-start gap-2">
                                <div className="space-y-0.5">
                                    <p className="font-semibold text-sm leading-tight text-foreground">{student.studentName}</p>
                                    <p className="text-xs text-muted-foreground">{student.className} • Roll {student.rollNo || '-'}</p>
                                </div>
                                <div className="px-2.5 py-1 bg-muted/70 text-muted-foreground rounded text-[10px] font-bold tracking-wider uppercase shrink-0">
                                    Seat {student.seatNumber || '-'}
                                </div>
                            </div>
                            <div className="flex justify-center gap-2 pt-3 border-t border-border/40 mt-auto">
                                {renderActionButtons(student.studentId, status, malpractice, isRowDisabled)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block border rounded-lg overflow-x-auto">
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
                            const state = localState[student.studentId] || { status: student.attendanceStatus, malpractice: student.malpractice || false, dirty: false, isSaving: false };
                            const status = state.status;
                            const malpractice = state.malpractice;
                            const isRowSaving = state.isSaving;
                            const isRowDisabled = isFinalized;

                            return (
                                <tr key={student.studentId} className={cn("transition-colors", isRowSaving && "opacity-60")}>
                                    <td className="px-6 py-4 font-medium">{student.seatNumber || '-'}</td>
                                    <td className="px-6 py-4">{student.rollNo || '-'}</td>
                                    <td className="px-6 py-4">{student.studentName}</td>
                                    <td className="px-6 py-4">{student.className}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center flex-wrap gap-2">
                                            {renderActionButtons(student.studentId, status, malpractice, isRowDisabled)}
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
