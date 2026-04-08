import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Badge } from '@/components/ui/badge';
import {
    Sparkles,
    Loader2,
    AlertCircle,
    CheckCircle2,
    XCircle,
    ArrowRight,
    BrainCircuit,
    Zap,
} from 'lucide-react';
import { timetableService } from '@/services/timetable';
import { academicClassService } from '@/services/academicClass';
import { generateTimetable } from '../services/autoGenerateService';
import type { BulkSectionResult, EditorContextDto, LLMTeacher, TimetablePeriod } from '../types';
import { useSelectTimetableScope } from '../hooks/useSelectTimetableScope';

type Phase = 'input' | 'fetching' | 'generating' | 'results';

interface BulkGenerateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface SectionData {
    sectionId: string;
    classId: string;
    className: string;
    sectionName: string;
    subjects: string[];
    teachers: LLMTeacher[];
    subjects_per_day: number;
    editorContext?: EditorContextDto;
}

// Track teacher bookings across sections: { "Teacher Name": { "Monday": [1, 3] } }
type TeacherBookings = Record<string, Record<string, number[]>>;

function buildAvailabilityConstraint(bookings: TeacherBookings): string {
    const lines: string[] = [];
    for (const [teacher, days] of Object.entries(bookings)) {
        for (const [day, periods] of Object.entries(days)) {
            lines.push(`- ${teacher} is UNAVAILABLE on ${day} at period(s): ${periods.sort((a, b) => a - b).join(', ')}`);
        }
    }
    if (!lines.length) return '';
    return `\n\nCRITICAL TEACHER AVAILABILITY CONSTRAINTS (from already-generated classes):\nThe following teachers are already booked in other classes at these slots. You MUST NOT assign them to these periods. Pick a DIFFERENT teacher who can teach the same subject, or rearrange.\n${lines.join('\n')}`;
}

function updateBookings(bookings: TeacherBookings, timetable: Record<string, TimetablePeriod[]>): TeacherBookings {
    const updated = { ...bookings };
    for (const [day, periods] of Object.entries(timetable)) {
        for (const period of periods) {
            const teacher = period.teacher;
            const periodNum = period.period;
            if (!teacher || !periodNum) continue;
            if (!updated[teacher]) updated[teacher] = {};
            if (!updated[teacher][day]) updated[teacher][day] = [];
            if (!updated[teacher][day].includes(periodNum)) {
                updated[teacher][day] = [...updated[teacher][day], periodNum];
            }
        }
    }
    return updated;
}

export function BulkGenerateModal({ open, onOpenChange }: BulkGenerateModalProps) {
    const navigate = useNavigate();
    const { selectScope } = useSelectTimetableScope();
    const [query, setQuery] = useState('');
    const [phase, setPhase] = useState<Phase>('input');
    const [error, setError] = useState<string | null>(null);
    const [sections, setSections] = useState<SectionData[]>([]);
    const [results, setResults] = useState<BulkSectionResult[]>([]);
    const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 });
    const [genProgress, setGenProgress] = useState({ current: 0, total: 0, currentLabel: '' });
    const cancelRef = useRef(false);

    // Restore from session storage or reset when opened
    useEffect(() => {
        if (open) {
            const savedStr = sessionStorage.getItem('bulk_generate_results');
            if (savedStr) {
                try {
                    const saved = JSON.parse(savedStr);
                    if (saved.results && saved.results.length > 0) {
                        setSections(saved.sections || []);
                        setResults(saved.results);
                        setPhase('results');
                        return;
                    }
                } catch (e) {
                    console.error('Failed to parse saved bulk results', e);
                }
            }
            
            // If no saved session, reset to fresh state
            setPhase('input');
            setError(null);
            setSections([]);
            setResults([]);
            setQuery('');
            setFetchProgress({ current: 0, total: 0 });
            setGenProgress({ current: 0, total: 0, currentLabel: '' });
            cancelRef.current = false;
        }
    }, [open]);

    /**
     * Step 1: Fetch all classes → sections → editor-context (parallel batches)
     */
    const fetchAllSections = useCallback(async (): Promise<SectionData[]> => {
        setPhase('fetching');
        setError(null);

        try {
            const classes = await academicClassService.getAllClasses();
            if (!classes.length) {
                setError('No classes found. Please create classes first.');
                setPhase('input');
                return [];
            }

            // Get all sections
            const allSections: Array<{ classId: string; className: string; sectionId: string; sectionName: string }> = [];
            for (const cls of classes) {
                try {
                    const sects = await academicClassService.getSectionsForClass(cls.classId);
                    for (const s of sects) {
                        allSections.push({
                            classId: cls.classId,
                            className: cls.name,
                            sectionId: s.uuid,
                            sectionName: s.sectionName,
                        });
                    }
                } catch { /* skip */ }
            }

            if (!allSections.length) {
                setError('No sections found. Please create sections for your classes first.');
                setPhase('input');
                return [];
            }

            setFetchProgress({ current: 0, total: allSections.length });

            // Fetch editor-context in parallel batches of 5
            const sectionDataList: SectionData[] = [];
            const BATCH_SIZE = 5;
            for (let batchStart = 0; batchStart < allSections.length; batchStart += BATCH_SIZE) {
                const batch = allSections.slice(batchStart, batchStart + BATCH_SIZE);
                const batchResults = await Promise.allSettled(
                    batch.map(s => timetableService.getEditorContext(s.sectionId))
                );

                batchResults.forEach((res, idx) => {
                    const s = batch[idx];
                    if (res.status === 'fulfilled') {
                        const ctx = res.value;
                        const subjectNames = ctx.availableSubjects.map(sub => sub.name);
                        const llmTeachers: LLMTeacher[] = ctx.teachers.map(t => ({
                            name: t.name,
                            subjects: ctx.availableSubjects
                                .filter(sub => t.teachableSubjectIds?.includes(sub.uuid))
                                .map(sub => sub.name),
                        }));
                        const teachingSlots = ctx.timeslots.filter(ts => !ts.isBreak && !ts.isNonTeachingSlot);
                        const daysWithSlots = new Set(teachingSlots.map(ts => ts.dayOfWeek));
                        const subjectsPerDay = daysWithSlots.size > 0
                            ? Math.ceil(teachingSlots.length / daysWithSlots.size)
                            : 6;

                        sectionDataList.push({
                            sectionId: s.sectionId,
                            classId: s.classId,
                            className: s.className,
                            sectionName: s.sectionName,
                            subjects: subjectNames,
                            teachers: llmTeachers,
                            subjects_per_day: subjectsPerDay,
                            editorContext: ctx,
                        });
                    } else {
                        sectionDataList.push({
                            sectionId: s.sectionId,
                            classId: s.classId,
                            className: s.className,
                            sectionName: s.sectionName,
                            subjects: [],
                            teachers: [],
                            subjects_per_day: 6,
                        });
                    }
                });

                setFetchProgress({ current: Math.min(batchStart + BATCH_SIZE, allSections.length), total: allSections.length });
            }

            setSections(sectionDataList);
            return sectionDataList;
        } catch (err: any) {
            setError(err.message || 'Failed to fetch class data.');
            setPhase('input');
            return [];
        }
    }, []);

    /**
     * Step 2: Generate timetables one section at a time (individual LLM calls)
     * This avoids a single long HTTP request that times out.
     */
    const handleGenerate = async () => {
        cancelRef.current = false;
        const sectionDataList = await fetchAllSections();
        if (!sectionDataList.length) return;

        const validSections = sectionDataList.filter(s => s.subjects.length > 0 && s.teachers.length > 0);
        const invalidSections = sectionDataList.filter(s => s.subjects.length === 0 || s.teachers.length === 0);

        if (!validSections.length) {
            setError('No sections have subjects and teachers configured. Please set up curriculum and teacher assignments first.');
            setPhase('input');
            return;
        }

        setPhase('generating');
        setGenProgress({ current: 0, total: validSections.length, currentLabel: '' });

        let teacherBookings: TeacherBookings = {};
        const generatedResults: BulkSectionResult[] = [];

        for (let i = 0; i < validSections.length; i++) {
            if (cancelRef.current) break;

            const section = validSections[i];
            const label = `${section.className} - ${section.sectionName}`;
            setGenProgress({ current: i + 1, total: validSections.length, currentLabel: label });

            try {
                const availabilityConstraint = buildAvailabilityConstraint(teacherBookings);
                const userQuery = (query || 'Create optimized timetables with balanced subject distribution.') + availabilityConstraint;

                const result = await generateTimetable({
                    subjects: section.subjects,
                    teachers: section.teachers,
                    subjects_per_day: section.subjects_per_day,
                    user_query: userQuery,
                });

                if (result.success && 'timetable' in result) {
                    const timetable = result.timetable as unknown as Record<string, TimetablePeriod[]>;
                    teacherBookings = updateBookings(teacherBookings, timetable);
                    generatedResults.push({
                        sectionId: section.sectionId,
                        className: section.className,
                        sectionName: section.sectionName,
                        success: true,
                        timetable,
                        notes: 'notes' in result ? (result as any).notes : '',
                    });
                } else {
                    generatedResults.push({
                        sectionId: section.sectionId,
                        className: section.className,
                        sectionName: section.sectionName,
                        success: false,
                        error: 'error' in result ? (result as any).error : 'LLM could not generate timetable.',
                    });
                }
            } catch (err: any) {
                generatedResults.push({
                    sectionId: section.sectionId,
                    className: section.className,
                    sectionName: section.sectionName,
                    success: false,
                    error: err.message || 'Generation failed for this section.',
                });
            }

            // Update results incrementally so user sees progress
            setResults([...generatedResults]);
        }

        // Add invalid sections
        const allResults: BulkSectionResult[] = [
            ...generatedResults,
            ...invalidSections.map(s => ({
                sectionId: s.sectionId,
                className: s.className,
                sectionName: s.sectionName,
                success: false,
                error: 'No subjects or teachers configured for this section.',
            })),
        ];

        // Natural sort
        allResults.sort((a, b) => {
            const aParts = a.className.split(/(\d+)/);
            const bParts = b.className.split(/(\d+)/);
            for (let j = 0; j < Math.max(aParts.length, bParts.length); j++) {
                const aP = aParts[j] || '';
                const bP = bParts[j] || '';
                const aNum = Number(aP);
                const bNum = Number(bP);
                if (!isNaN(aNum) && !isNaN(bNum) && aNum !== bNum) return aNum - bNum;
                const cmp = aP.localeCompare(bP);
                if (cmp !== 0) return cmp;
            }
            return a.sectionName.localeCompare(b.sectionName);
        });

        setResults(allResults);
        setPhase('results');

        // Save to session storage so we can restore after navigating back from the editor
        try {
            sessionStorage.setItem('bulk_generate_results', JSON.stringify({
                results: allResults,
                sections: sectionDataList
            }));
        } catch (e) {
            console.error('Failed to save bulk results to session storage', e);
        }
    };

    /**
     * Navigate to editor with AI timetable pre-loaded
     */
    const handleOpenEditor = (result: BulkSectionResult) => {
        if (!result.success || !result.timetable) return;
        const section = sections.find(s => s.sectionId === result.sectionId);
        const classId = section?.classId || '';
        selectScope(classId, result.sectionId, result.className, result.sectionName);
        onOpenChange(false);
        navigate(`/dashboard/admin/timetable/editor/${classId}/${result.sectionId}`, {
            state: { aiTimetable: result.timetable },
        });
    };

    const handleClose = () => {
        if (phase === 'generating') {
            cancelRef.current = true;
        }
        if (phase !== 'fetching') {
            onOpenChange(false);
        }
    };

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className={`bg-card border-border overflow-hidden transition-all ${phase === 'results' ? 'sm:max-w-[800px]' : 'sm:max-w-[560px]'}`}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-foreground">
                        <Sparkles className="w-5 h-5 text-violet-500" />
                        {phase === 'results' ? 'Generated Timetables' : 'AI Timetable — All Classes'}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        {phase === 'results'
                            ? `${successCount} succeeded, ${failedCount} failed. Click a card to review and save.`
                            : 'Generate timetables for every class and section in one go.'
                        }
                    </DialogDescription>
                </DialogHeader>

                {/* ─── INPUT PHASE ──────────────────────────────────────────── */}
                {phase === 'input' && (
                    <div className="py-4 space-y-4">
                        <Textarea
                            placeholder="Global constraints for all classes (e.g., 'No heavy subjects after lunch', 'Distribute Math evenly', 'Keep lab periods in morning')"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            className="min-h-[120px] resize-none bg-background border-border text-foreground"
                        />
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider bg-muted/30 p-2 rounded border border-border/50">
                            <BrainCircuit className="w-3 h-3 text-violet-500" />
                            Sequential generation with teacher availability tracking
                        </div>

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
                )}

                {/* ─── FETCHING PHASE ───────────────────────────────────────── */}
                {phase === 'fetching' && (
                    <div className="py-12 flex flex-col items-center justify-center gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                            </div>
                            <motion.div
                                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 rounded-2xl bg-violet-400/20"
                            />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-sm font-semibold text-foreground">Fetching class data...</p>
                            <p className="text-xs text-muted-foreground">
                                Loaded {fetchProgress.current} of {fetchProgress.total} sections
                            </p>
                            {fetchProgress.total > 0 && (
                                <div className="w-48 h-1.5 rounded-full bg-violet-100 mx-auto mt-2 overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                                        animate={{ width: `${(fetchProgress.current / fetchProgress.total) * 100}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── GENERATING PHASE (per-section progress) ─────────────── */}
                {phase === 'generating' && (
                    <div className="py-6 space-y-4">
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                                    <Loader2 className="w-7 h-7 text-violet-500 animate-spin" />
                                </div>
                                <motion.div
                                    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="absolute inset-0 rounded-2xl bg-violet-400/20"
                                />
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-sm font-semibold text-foreground">
                                    Generating {genProgress.current} of {genProgress.total}
                                </p>
                                <p className="text-xs text-violet-600 font-medium">{genProgress.currentLabel}</p>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full max-w-xs">
                                <div className="w-full h-2 rounded-full bg-violet-100 overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
                                        animate={{ width: `${(genProgress.current / Math.max(genProgress.total, 1)) * 100}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-[10px] text-muted-foreground">
                                        {successCount} ✓ {failedCount > 0 ? `· ${failedCount} ✗` : ''}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        ~{Math.max(0, (genProgress.total - genProgress.current)) * 15}s remaining
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Live result cards (scrollable) */}
                        {results.length > 0 && (
                            <div className="max-h-[200px] overflow-y-auto space-y-1.5 px-1">
                                {results.map((r, idx) => (
                                    <div
                                        key={`${r.sectionId}-${idx}`}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                                            r.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                                        }`}
                                    >
                                        {r.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                                        <span className="font-medium">{r.className} - {r.sectionName}</span>
                                        {!r.success && r.error && <span className="ml-auto text-[10px] truncate max-w-[150px]">{r.error}</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── RESULTS PHASE ────────────────────────────────────────── */}
                {phase === 'results' && (
                    <div className="py-2">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 border shadow-none">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> {successCount} Success
                                </Badge>
                                {failedCount > 0 && (
                                    <Badge className="bg-red-500/10 text-red-600 border-red-500/20 border shadow-none">
                                        <XCircle className="w-3 h-3 mr-1" /> {failedCount} Failed
                                    </Badge>
                                )}
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-xs border-dashed"
                                onClick={() => {
                                    sessionStorage.removeItem('bulk_generate_results');
                                    setPhase('input');
                                    setResults([]);
                                    setSections([]);
                                }}
                            >
                                Clear & Start Over
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                            {results.map((result, idx) => (
                                <motion.div
                                    key={`${result.sectionId}-${idx}`}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                                    className={`group relative rounded-xl border p-4 transition-all cursor-pointer hover:shadow-md ${
                                        result.success
                                            ? 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300 hover:bg-emerald-50'
                                            : 'border-red-200 bg-red-50/30 hover:border-red-300'
                                    }`}
                                    onClick={() => result.success && handleOpenEditor(result)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                                                result.success ? 'bg-emerald-500/10' : 'bg-red-500/10'
                                            }`}>
                                                {result.success ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-red-500" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-foreground">{result.className}</p>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs text-muted-foreground">Section {result.sectionName}</span>
                                                    {result.success && result.timetable && (
                                                        <span className="text-[10px] text-emerald-600 font-medium">
                                                            · {Object.values(result.timetable).reduce((sum, d) => sum + d.length, 0)} periods
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {result.success && (
                                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                                        )}
                                    </div>

                                    {!result.success && result.error && (
                                        <p className="mt-2 text-[11px] text-red-500 leading-tight line-clamp-2">{result.error}</p>
                                    )}

                                    {result.success && (
                                        <p className="mt-2 text-[10px] text-emerald-600/70 font-medium">Click to review & save →</p>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    {phase === 'input' && (
                        <>
                            <Button variant="ghost" onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleGenerate}
                                className="bg-violet-600 hover:bg-violet-700 text-white gap-2 shadow-lg shadow-violet-200"
                            >
                                <Zap className="w-4 h-4" />
                                Generate All
                            </Button>
                        </>
                    )}
                    {phase === 'generating' && (
                        <Button variant="ghost" onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                            Cancel Generation
                        </Button>
                    )}
                    {phase === 'results' && (
                        <Button variant="ghost" onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                            Close
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
