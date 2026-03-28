import { useCallback, useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
    DndContext,
    DragOverlay,
    pointerWithin,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { SidebarSubjects } from './SidebarSubjects';
import { SidebarTeachers } from './SidebarTeachers';
import { TimetableGrid } from './TimetableGrid';
import { AutoGenerateModal } from './AutoGenerateModal';
import { CellEditDialog } from './CellEditDialog';
import { setSubjectToCell, setTeacherToCell, resetGrid, setSelectedClass, setSelectedSection } from '../store/timetableSlice';
import { generateTimetable } from '../services/autoGenerateService';
import type { RootState } from '@/store/store';
import type { Subject, Teacher, LLMTeacher, GeneratedTimetable, ScheduleRequestDto } from '../types';
import { 
    useBulkUpdateSchedule, 
    useUpdateScheduleStatus, 
    useGetEditorContext, 
    useGetRooms,
    useDeleteSectionSchedule 
} from '../queries/useTimetableQueries';
import { ArrowLeft, Save, Send, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from './ConfirmDialog';

const normalizeTime = (time: string) => {
    if (!time) return '';
    const parts = time.split(':');
    const hours = parts[0].trim().padStart(2, '0');
    const minutes = (parts[1] || '0').trim().padStart(2, '0');
    return `${hours}:${minutes}`;
};

export function TimetableEditor() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { selectedClass, selectedSection, grid } = useSelector(
        (state: RootState) => state.timetable
    );
    const { sectionId, classId } = useParams();
    const sectionIdToUse = selectedSection?._id || sectionId;
    const [activeDragItem, setActiveDragItem] = useState<{ type: string; item: Subject | Teacher } | null>(null);

    // Dialog state
    const [isAutoGenerateModalOpen, setIsAutoGenerateModalOpen] = useState(false);
    const [editingCellKey, setEditingCellKey] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    // Track whether we've already hydrated the grid for this section (prevents duplicate hydration)
    const [hydratedSectionId, setHydratedSectionId] = useState<string | null>(null);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);

    // ─── Live API ─────────────────────────────────────────────────────────────
    const { data: editorContext, isLoading: isContextLoading } = useGetEditorContext(sectionIdToUse);
    const { data: rooms = [] } = useGetRooms();
    const { mutate: bulkUpdate, isPending: isSavingData } = useBulkUpdateSchedule();
    const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateScheduleStatus();
    const deleteTimetable = useDeleteSectionSchedule();

    const isSaving = isSavingData || isUpdatingStatus || deleteTimetable.isPending;

    // ─── Map API data → local Subject/Teacher types for Sidebars ─────────────
    const liveSubjects: Subject[] = useMemo(() => {
        if (!editorContext?.availableSubjects) return [];
        return editorContext.availableSubjects.map(s => ({
            _id: s.uuid,
            name: s.name,
            code: s.subjectCode,
            color: s.color || 'bg-blue-100 border-blue-200 text-blue-800',
        }));
    }, [editorContext?.availableSubjects]);

    const liveTeachers: Teacher[] = useMemo(() => {
        if (!editorContext?.teachers) return [];
        return editorContext.teachers.map(t => ({
            _id: t.id,
            name: t.name,
            teachableSubjects: t.teachableSubjectIds,
        }));
    }, [editorContext?.teachers]);

    // ─── Hydrate Redux selection from URL if missing ─────────────────────────
    useEffect(() => {
        if (editorContext?.section && (!selectedSection || !selectedClass)) {
            dispatch(setSelectedClass({ _id: classId || '', name: editorContext.section.className }));
            dispatch(setSelectedSection({ _id: sectionId || '', name: editorContext.section.sectionName }));
        }
    }, [editorContext?.section, selectedSection, selectedClass, dispatch, classId, sectionId]);

    // ─── Hydrate Grid from Existing Schedule ──────────────────────────────────
    useEffect(() => {
        if (
            editorContext &&
            editorContext.existingSchedule.length > 0 &&
            sectionIdToUse &&
            hydratedSectionId !== sectionIdToUse
        ) {
            dispatch(resetGrid());
            setHydratedSectionId(sectionIdToUse);

            setTimeout(() => {
                const DAYS_LIST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                
                // 1. First, mark all BREAK and NON-TEACHING slots as locked in the grid
                editorContext.timeslots.forEach(ts => {
                    const isLabelBreak = ts.slotLabel?.toLowerCase().includes('lunch') || ts.slotLabel?.toLowerCase().includes('break');
                    const isNonTeaching = ts.isNonTeachingSlot || ts.slotLabel?.toLowerCase().includes('assembly') || ts.slotLabel?.toLowerCase().includes('office');
                    
                    if (ts.isBreak || isLabelBreak || ts.isNonTeachingSlot || isNonTeaching) {
                        const dayName = DAYS_LIST[ts.dayOfWeek - 1] || 'Monday';
                        const timeStr = normalizeTime(ts.startTime);
                        const cellKey = `${dayName}_${timeStr}`;
                        
                        let label = ts.slotLabel;
                        if (ts.isBreak || isLabelBreak) {
                            label = ts.slotLabel?.toLowerCase().includes('lunch') ? 'Lunch' : 'Break';
                        }
                        
                        const color = (ts.isBreak || isLabelBreak) 
                            ? 'bg-orange-50 text-orange-600 border-orange-200' 
                            : 'bg-slate-100 text-slate-500 border-slate-200';

                        dispatch(setSubjectToCell({ 
                            cellKey, 
                            subject: { _id: 'break', name: label, code: 'LOCKED', color: color } as any 
                        }));
                        dispatch(setTeacherToCell({ cellKey, teacher: { _id: 'break-sys', name: label } as any }));
                    }
                });

                // 2. Then, hydrate existing schedule entries
                editorContext.existingSchedule.forEach((entry) => {
                    let cellKey = null;
                    if (entry.timeslotId) {
                        const ts = editorContext.timeslots.find(t => t.uuid === entry.timeslotId);
                        if (ts) {
                            const dayName = DAYS_LIST[ts.dayOfWeek - 1] || 'Monday';
                            const timeStr = normalizeTime(ts.startTime);
                            cellKey = `${dayName}_${timeStr}`;
                        }
                    }

                    if (!cellKey) cellKey = entry.slotLabel;

                    const subject = liveSubjects.find(s => s._id === entry.subjectId);
                    const teacher = liveTeachers.find(t => t._id === entry.teacherId);

                    if (cellKey && subject && teacher) {
                        dispatch(setSubjectToCell({ cellKey, subject }));
                        dispatch(setTeacherToCell({ cellKey, teacher }));
                    }
                });
            }, 100);
        }
    }, [editorContext, liveSubjects, liveTeachers, sectionIdToUse, hydratedSectionId, dispatch, rooms]);

    // Reset hydration tracking when section changes
    useEffect(() => {
        if (sectionIdToUse && hydratedSectionId !== sectionIdToUse) {
            dispatch(resetGrid());
        }
    }, [sectionIdToUse]); // eslint-disable-line react-hooks/exhaustive-deps

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        const data = active.data.current as { type: string; item: Subject | Teacher } | undefined;
        if (data) {
            setActiveDragItem(data);
        }
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragItem(null);

        if (!over) return;

        const dragData = active.data.current as { type: string; item: Subject | Teacher; targetCellKey?: string } | undefined;
        const dropData = over.data.current as { cellKey: string; status: string } | undefined;

        if (!dragData || !dropData) return;

        const { type, item, targetCellKey } = dragData;
        const { cellKey, status } = dropData;

        if (type === 'SUBJECT' && status === 'EMPTY') {
            dispatch(setSubjectToCell({ cellKey, subject: item as Subject }));
        }

        if (type === 'TEACHER' && status === 'AWAITING_TEACHER') {
            if (targetCellKey === cellKey) {
                dispatch(setTeacherToCell({ cellKey, teacher: item as Teacher }));
            }
        }
    }, [dispatch]);

    const handleEditCell = (cellKey: string) => {
        setEditingCellKey(cellKey);
        setIsEditModalOpen(true);
    };

    // ─── Build Payload for Bulk Save ──────────────────────────────────────────
    const generatePayload = (): ScheduleRequestDto[] => {
        if (!selectedSection || !editorContext) return [];

        const slotToTimeslotId: Record<string, string> = {};
        const DAYS_LIST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        editorContext.timeslots.forEach(ts => {
            const dayName = DAYS_LIST[ts.dayOfWeek - 1] || 'Monday';
            const timeStr = normalizeTime(ts.startTime);
            const fallbackKey = `${dayName}_${timeStr}`;
            slotToTimeslotId[fallbackKey] = ts.uuid;
            if (ts.slotLabel) {
                slotToTimeslotId[ts.slotLabel] = ts.uuid;
            }
        });

        const timeslotIdLookup = (label: string) => {
            if (slotToTimeslotId[label]) return slotToTimeslotId[label];
            const [dayName, startTime] = label.split('_');
            const normalizedT = normalizeTime(startTime);
            return editorContext.timeslots.find(t => 
                (DAYS_LIST[t.dayOfWeek - 1] === dayName) && 
                normalizeTime(t.startTime) === normalizedT
            )?.uuid;
        };

        const payload: ScheduleRequestDto[] = [];
        const seenTimeslots = new Set<string>();

        Object.entries(grid).forEach(([slotLabel, value]) => {
            if (value.status === 'LOCKED' && value.subject && value.teacher && value.subject._id !== 'break') {
                const timeslotId = timeslotIdLookup(slotLabel);

                if (!timeslotId || seenTimeslots.has(timeslotId)) return;

                // Priority: Use per-cell roomId from the grid. 
                // We send null for roomId if it's not set, letting the backend intelligently auto-assign.
                const roomId = value.roomId || null;

                payload.push({
                    sectionId: selectedSection._id,
                    subjectId: value.subject._id,
                    teacherId: value.teacher._id,
                    roomId: roomId,
                    timeslotId,
                });
                
                seenTimeslots.add(timeslotId);
            }
        });
        return payload;
    };

    const handleSaveDraft = () => {
        if (!selectedSection) return;
        const payload = generatePayload();
        if (payload.length === 0) {
            toast.warning('No completed periods to save.');
            return;
        }
        bulkUpdate(
            { sectionId: selectedSection._id, payload },
            {
                onSuccess: () => {
                    updateStatus({ sectionId: selectedSection._id, statusType: 'draft' });
                },
                onError: (error: any) => {
                    const errorMsg = error?.response?.data?.message || "Failed to save.";
                    toast.error(errorMsg);
                }
            }
        );
    };

    const handlePublish = () => {
        setIsPublishConfirmOpen(true);
    };

    const confirmPublish = () => {
        if (!selectedSection) return;
        const payload = generatePayload();
        if (payload.length === 0) {
            toast.warning('Nothing to publish.');
            setIsPublishConfirmOpen(false);
            return;
        }
        bulkUpdate(
            { sectionId: selectedSection._id, payload },
            {
                onSuccess: () => {
                    updateStatus(
                        { sectionId: selectedSection._id, statusType: 'publish' },
                        {
                            onSuccess: () => {
                                setIsPublishConfirmOpen(false);
                                toast.success("Published!");
                                navigate(`/dashboard/admin/timetable/reader/${classId}/${sectionId}`);
                            }
                        }
                    );
                },
                onError: (error: any) => {
                    setIsPublishConfirmOpen(false);
                    toast.error(error?.response?.data?.message || "Failed to publish.");
                }
            }
        );
    };

    const handleReset = () => {
        setIsResetConfirmOpen(true);
    };

    const confirmReset = () => {
        dispatch(resetGrid());
        setHydratedSectionId(null);
        setIsResetConfirmOpen(false);
    };

    // ─── Auto Generate ─────────────────────────────────────────────────────────
    const findSubjectByName = (name: string): Subject | undefined =>
        liveSubjects.find(s => s.name.toLowerCase() === name.toLowerCase());

    const findTeacherByName = (name: string): Teacher | undefined =>
        liveTeachers.find(t => t.name.toLowerCase() === name.toLowerCase());

    const animateFillGrid = async (timetable: GeneratedTimetable) => {
        if (!editorContext) return;

        const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const uniqueDays = Array.from(new Set(editorContext.timeslots.map(ts => 
            daysOrder[ts.dayOfWeek - 1] || 'Monday'
        ))).sort((a, b) => daysOrder.indexOf(a) - daysOrder.indexOf(b));

        const uniqueTimes = Array.from(new Set(editorContext.timeslots.map(ts => 
            ts.startTime.substring(0, 5)
        ))).sort();

        dispatch(resetGrid());
        await new Promise(resolve => setTimeout(resolve, 300));

        for (const day of uniqueDays) {
            const periods = timetable[day as keyof GeneratedTimetable];
            if (!periods) continue;

            for (const periodData of periods) {
                const timeSlotIndex = periodData.period - 1;
                if (timeSlotIndex < 0 || timeSlotIndex >= uniqueTimes.length) continue;

                const timeSlot = uniqueTimes[timeSlotIndex];
                const cellKey = `${day}_${timeSlot}`;

                const subject = findSubjectByName(periodData.subject);
                const teacher = findTeacherByName(periodData.teacher);

                if (subject) {
                    dispatch(setSubjectToCell({ cellKey, subject }));
                    await new Promise(resolve => setTimeout(resolve, 80));

                    if (teacher) {
                        dispatch(setTeacherToCell({ cellKey, teacher }));
                        await new Promise(resolve => setTimeout(resolve, 80));
                    }
                }
            }
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="z-10 bg-card rounded-xl border border-border shadow-sm p-4"
                >
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate('/dashboard/admin/timetable')}
                                className="shrink-0"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div>
                                <h1 className="text-lg font-semibold">Timetable Editor</h1>
                                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                                    {selectedClass?.name || '...'} | {selectedSection?.name || '...'}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                onClick={() => setIsAutoGenerateModalOpen(true)}
                                disabled={isContextLoading || !editorContext}
                                className="ai-glow-button gap-2 text-xs h-8"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                AI Generate
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleReset}
                                className="gap-2 text-xs h-8"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reset
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSaveDraft}
                                disabled={!selectedSection || isSaving || isContextLoading}
                                className="gap-2 text-xs h-8"
                            >
                                <Save className="w-3.5 h-3.5" />
                                {isSaving ? '...' : 'Save Draft'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsDeleteConfirmOpen(true)}
                                disabled={!selectedSection || isSaving || isContextLoading}
                                className="gap-2 text-xs h-8 text-destructive border-destructive/10"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                            </Button>
                            <Button
                                size="sm"
                                onClick={handlePublish}
                                disabled={!selectedSection || isSaving || isContextLoading}
                                className="gap-2 text-xs h-8"
                            >
                                <Send className="w-3.5 h-3.5" />
                                Publish
                            </Button>
                        </div>
                    </div>
                </motion.header>

                {/* Content */}
                <div className="grid xl:grid-cols-[220px_1fr_220px] lg:grid-cols-[180px_1fr_180px] grid-cols-1 gap-4">
                    <SidebarSubjects subjects={liveSubjects} isLoading={isContextLoading} />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card/50 rounded-xl p-4 border shadow-sm backdrop-blur-sm"
                    >
                        <TimetableGrid 
                            sectionId={sectionIdToUse} 
                            onEditCell={handleEditCell} 
                            rooms={rooms}
                        />
                    </motion.div>

                    <SidebarTeachers teachers={liveTeachers} isLoading={isContextLoading} />
                </div>

                {/* Overlays */}
                <DragOverlay>
                    {activeDragItem && (
                        <div className="p-3 rounded-lg bg-card border-2 border-primary shadow-2xl scale-105">
                            <span className="text-xs font-bold font-mono">
                                {(activeDragItem.item as Subject).name || (activeDragItem.item as Teacher).name}
                            </span>
                        </div>
                    )}
                </DragOverlay>

                <AutoGenerateModal
                    open={isAutoGenerateModalOpen}
                    onOpenChange={setIsAutoGenerateModalOpen}
                    sectionId={sectionIdToUse || ''}
                    timeslots={editorContext?.timeslots || []}
                />

                <CellEditDialog
                    open={isEditModalOpen}
                    onOpenChange={setIsEditModalOpen}
                    cellKey={editingCellKey || ''}
                    cellData={editingCellKey ? grid[editingCellKey] : { subject: null, teacher: null, status: 'EMPTY' }}
                    subjects={liveSubjects}
                    teachers={liveTeachers}
                    rooms={rooms}
                />

                <ConfirmDialog 
                    isOpen={isResetConfirmOpen}
                    onClose={() => setIsResetConfirmOpen(false)}
                    onConfirm={confirmReset}
                    title="Reset Grid?"
                    description="This will clear all unsaved changes and revert the grid to its last saved state."
                />

                <ConfirmDialog 
                    isOpen={isDeleteConfirmOpen}
                    onClose={() => setIsDeleteConfirmOpen(false)}
                    onConfirm={async () => {
                        if (sectionIdToUse) {
                            await deleteTimetable.mutateAsync(sectionIdToUse);
                            setIsDeleteConfirmOpen(false);
                            dispatch(resetGrid());
                        }
                    }}
                    title="Delete Timetable?"
                    description="Are you sure you want to permanently delete the entire schedule for this section? This action cannot be undone."
                />

                <ConfirmDialog 
                    isOpen={isPublishConfirmOpen}
                    onClose={() => setIsPublishConfirmOpen(false)}
                    onConfirm={confirmPublish}
                    title="Publish Changes?"
                    description="This will make your latest timetable changes live and visible to students and teachers."
                />
            </div>
        </DndContext>
    );
}
