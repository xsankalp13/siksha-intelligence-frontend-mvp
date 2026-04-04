import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch } from 'react-redux';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, AlertCircle, Zap, BrainCircuit, CheckCircle2 } from 'lucide-react';
import { generateTimetable } from '../services/autoGenerateService';
import { resetGrid, setSubjectToCell, setTeacherToCell, fillCellSubject, fillCellTeacher, clearIsNewFlags, setIsGenerating } from '../store/timetableSlice';
import type { Subject, Teacher, EditorContextDto, TimetablePeriod, AutoGenerateRequest, LLMTeacher } from '../types';
import { createPortal } from 'react-dom';

const DAYS_LIST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

const normalizeTime = (time: string) => {
    if (!time) return '';
    const parts = time.split(':');
    const hours = parts[0].trim().padStart(2, '0');
    const minutes = (parts[1] || '0').trim().padStart(2, '0');
    return `${hours}:${minutes}`;
};

interface AutoGenerateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sectionId: string;
    timeslots: any[];
    subjects: Subject[];
    teachers: Teacher[];
    editorContext?: EditorContextDto;
}

/** Floating progress toast shown during animation */
function AnimationToast({ current, total, isComplete }: { current: number; total: number; isComplete: boolean }) {
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -40, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
            >
                <div className="flex items-center gap-3 px-5 py-3 bg-card/95 backdrop-blur-xl border border-violet-200 rounded-2xl shadow-2xl shadow-violet-500/20">
                    {isComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                        <Loader2 className="w-5 h-5 text-violet-500 animate-spin shrink-0" />
                    )}
                    <div className="flex flex-col">
                        <span className="text-xs font-black text-foreground">
                            {isComplete
                                ? `✓ All ${total} periods placed!`
                                : `Placing period ${current} of ${total}...`
                            }
                        </span>
                        {!isComplete && (
                            <div className="mt-1.5 w-40 h-1.5 rounded-full bg-violet-100 overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                                    initial={{ width: '0%' }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                />
                            </div>
                        )}
                    </div>
                    <span className="text-sm font-black text-violet-600 ml-1 tabular-nums">
                        {pct}%
                    </span>
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}

export function AutoGenerateModal({
    open,
    onOpenChange,
    sectionId,
    timeslots,
    subjects,
    teachers,
    editorContext,
}: AutoGenerateModalProps) {
    const dispatch = useDispatch();
    const [query, setQuery] = useState('');
    const [isCallingLLM, setIsCallingLLM] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [animationProgress, setAnimationProgress] = useState<{ current: number; total: number; isComplete: boolean } | null>(null);
    const animationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const cleanup = useCallback(() => {
        if (animationTimerRef.current) {
            clearInterval(animationTimerRef.current);
            animationTimerRef.current = null;
        }
    }, []);

    const getSubjectsPerDay = useCallback((): number => {
        const teachingSlots = (timeslots || [])
            .filter(ts => !ts.isBreak && !ts.isNonTeachingSlot);
        const daysWithSlots = new Set(teachingSlots.map(ts => ts.dayOfWeek));
        if (daysWithSlots.size === 0) return 6;
        return Math.ceil(teachingSlots.length / daysWithSlots.size);
    }, [timeslots]);

    const getOrderedTeachingCellKeys = useCallback((): string[] => {
        const teachingSlots = (timeslots || [])
            .filter(ts => !ts.isBreak && !ts.isNonTeachingSlot)
            .sort((a, b) => {
                if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
                return normalizeTime(a.startTime).localeCompare(normalizeTime(b.startTime));
            });
        return teachingSlots.map(ts => {
            const dayName = DAYS_LIST[ts.dayOfWeek - 1] || 'Monday';
            return `${dayName}_${normalizeTime(ts.startTime)}`;
        });
    }, [timeslots]);

    const getCellKeysByDay = useCallback((): Record<string, string[]> => {
        const result: Record<string, string[]> = {};
        const teachingSlots = (timeslots || [])
            .filter(ts => !ts.isBreak && !ts.isNonTeachingSlot)
            .sort((a, b) => normalizeTime(a.startTime).localeCompare(normalizeTime(b.startTime)));
        for (const ts of teachingSlots) {
            const dayName = DAYS_LIST[ts.dayOfWeek - 1] || 'Monday';
            const cellKey = `${dayName}_${normalizeTime(ts.startTime)}`;
            if (!result[dayName]) result[dayName] = [];
            result[dayName].push(cellKey);
        }
        return result;
    }, [timeslots]);

    const findSubject = useCallback((name: string): Subject | null => {
        const lower = name.toLowerCase().trim();
        return subjects.find(s => s.name.toLowerCase().trim() === lower) || null;
    }, [subjects]);

    const findTeacher = useCallback((name: string): Teacher | null => {
        const lower = name.toLowerCase().trim();
        return teachers.find(t => t.name.toLowerCase().trim() === lower) || null;
    }, [teachers]);

    const rehydrateBreaks = useCallback(() => {
        (timeslots || []).forEach(ts => {
            const isLabelBreak = ts.slotLabel?.toLowerCase().includes('lunch') || ts.slotLabel?.toLowerCase().includes('break');
            const isNonTeaching = ts.isNonTeachingSlot || ts.slotLabel?.toLowerCase().includes('assembly') || ts.slotLabel?.toLowerCase().includes('office');
            if (ts.isBreak || isLabelBreak || ts.isNonTeachingSlot || isNonTeaching) {
                const dayName = DAYS_LIST[ts.dayOfWeek - 1] || 'Monday';
                const cellKey = `${dayName}_${normalizeTime(ts.startTime)}`;
                let label = ts.slotLabel;
                if (ts.isBreak || isLabelBreak) {
                    label = ts.slotLabel?.toLowerCase().includes('lunch') ? 'Lunch' : 'Break';
                }
                const color = (ts.isBreak || isLabelBreak)
                    ? 'bg-orange-50 text-orange-600 border-orange-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200';
                dispatch(setSubjectToCell({ cellKey, subject: { _id: 'break', name: label, code: 'LOCKED', color } as any }));
                dispatch(setTeacherToCell({ cellKey, teacher: { _id: 'break-sys', name: label } as any }));
            }
        });
    }, [timeslots, dispatch]);

    const handleGenerate = async () => {
        setError(null);
        setIsCallingLLM(true);
        dispatch(setIsGenerating(true));
        cleanup();

        try {
            const llmTeachers: LLMTeacher[] = teachers.map(t => ({
                name: t.name,
                subjects: subjects.filter(s => t.teachableSubjects?.includes(s._id)).map(s => s.name),
            }));

            const request: AutoGenerateRequest = {
                subjects: subjects.map(s => s.name),
                teachers: llmTeachers,
                subjects_per_day: getSubjectsPerDay(),
                user_query: query || 'Create an optimized timetable with balanced subject distribution.',
            };

            const response = await generateTimetable(request);

            if (!response.success) {
                const errResponse = response as { error?: string; conflicting_constraints?: string[] };
                const constraintInfo = errResponse.conflicting_constraints?.length
                    ? `\nConflicting: ${errResponse.conflicting_constraints.join(', ')}`
                    : '';
                setError((errResponse.error || 'LLM could not generate a timetable.') + constraintInfo);
                setIsCallingLLM(false);
                dispatch(setIsGenerating(false));
                return;
            }

            const successResponse = response as { timetable: Record<string, TimetablePeriod[]>; notes?: string };
            const timetable = successResponse.timetable;

            // Reset grid and breaks
            dispatch(resetGrid());
            setTimeout(() => rehydrateBreaks(), 50);

            // Build animation queue
            const cellKeysByDay = getCellKeysByDay();
            type AnimItem = { cellKey: string; subject: Subject; teacher: Teacher };
            const animationQueue: AnimItem[] = [];
            for (const dayName of Object.keys(timetable)) {
                const periods = timetable[dayName];
                const dayCellKeys = cellKeysByDay[dayName] || [];
                periods.forEach((period, idx) => {
                    if (idx >= dayCellKeys.length) return;
                    const subject = findSubject(period.subject);
                    const teacher = findTeacher(period.teacher);
                    if (subject && teacher) {
                        animationQueue.push({ cellKey: dayCellKeys[idx], subject, teacher });
                    }
                });
            }

            const orderedKeys = getOrderedTeachingCellKeys();
            animationQueue.sort((a, b) => orderedKeys.indexOf(a.cellKey) - orderedKeys.indexOf(b.cellKey));

            // Close the modal and show floating toast
            setIsCallingLLM(false);
            onOpenChange(false);
            setQuery('');
            setAnimationProgress({ current: 0, total: animationQueue.length, isComplete: false });

            // Start animation
            let i = 0;
            animationTimerRef.current = setInterval(() => {
                if (i >= animationQueue.length) {
                    cleanup();
                    setTimeout(() => dispatch(clearIsNewFlags()), 1500);
                    setAnimationProgress(prev => prev ? { ...prev, isComplete: true } : null);
                    dispatch(setIsGenerating(false));
                    // Auto-dismiss toast after 2.5s
                    setTimeout(() => setAnimationProgress(null), 2500);
                    return;
                }
                const item = animationQueue[i];
                dispatch(fillCellSubject({ cellKey: item.cellKey, subject: item.subject }));
                setTimeout(() => {
                    dispatch(fillCellTeacher({ cellKey: item.cellKey, teacher: item.teacher }));
                }, 60);
                i++;
                setAnimationProgress(prev => prev ? { ...prev, current: i } : null);
            }, 120);

        } catch (err: any) {
            setError(err.message || 'Failed to generate timetable. Is the LLM server running?');
            setIsCallingLLM(false);
            dispatch(setIsGenerating(false));
        }
    };

    const handleClose = () => {
        if (!isCallingLLM) {
            setQuery('');
            setError(null);
            onOpenChange(false);
        }
    };

    return (
        <>
            {/* Floating progress toast — rendered outside the modal via portal */}
            {animationProgress && (
                <AnimationToast
                    current={animationProgress.current}
                    total={animationProgress.total}
                    isComplete={animationProgress.isComplete}
                />
            )}

            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-[520px] bg-card border-border overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-foreground">
                            <Sparkles className="w-5 h-5 text-violet-500" />
                            AI Timetable Architect
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Describe your constraints and watch AI build your schedule in real-time.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <Textarea
                            placeholder="Any specific requirements? (e.g., 'No heavy subjects after lunch', 'Keep Science in the morning', 'Math should be distributed evenly')"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="min-h-[120px] resize-none bg-background border-border text-foreground"
                            disabled={isCallingLLM}
                        />

                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider bg-muted/30 p-2 rounded border border-border/50">
                            <BrainCircuit className="w-3 h-3 text-violet-500" />
                            Engine: GPT-4o via LLM Server (localhost:5000)
                        </div>

                        {subjects.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {subjects.slice(0, 8).map(s => (
                                    <span key={s._id} className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/10 text-primary border border-primary/20">
                                        {s.name}
                                    </span>
                                ))}
                                {subjects.length > 8 && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-muted text-muted-foreground">
                                        +{subjects.length - 8} more
                                    </span>
                                )}
                            </div>
                        )}

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30"
                                >
                                    <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                    <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="ghost"
                            onClick={handleClose}
                            disabled={isCallingLLM}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleGenerate}
                            disabled={isCallingLLM || subjects.length === 0 || teachers.length === 0}
                            className="bg-violet-600 hover:bg-violet-700 text-white gap-2 shadow-lg shadow-violet-200"
                        >
                            {isCallingLLM ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4" />
                                    Generate Draft
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
