import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
    DndContext,
    DragOverlay,
    closestCenter,
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
import { setSubjectToCell, setTeacherToCell, resetGrid } from '../store/timetableSlice';
import { generateTimetable } from '../services/autoGenerateService';
import { initialSubjects, initialTeachers } from '../data/mockData';
import type { RootState } from '@/store/store';
import type { Subject, Teacher, LLMTeacher, GeneratedTimetable } from '../types';
import { ArrowLeft, Save, Send, RotateCcw, Sparkles } from 'lucide-react';

export function TimetableEditor() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { selectedClass, selectedSection, grid } = useSelector(
        (state: RootState) => state.timetable
    );
    const [activeDragItem, setActiveDragItem] = useState<{ type: string; item: Subject | Teacher } | null>(null);

    // Auto Generate state
    const [isAutoGenerateModalOpen, setIsAutoGenerateModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [autoGenerateError, setAutoGenerateError] = useState<string | null>(null);

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

        // Handle subject drop to empty cell
        if (type === 'SUBJECT' && status === 'EMPTY') {
            dispatch(setSubjectToCell({ cellKey, subject: item as Subject }));
        }

        // Handle teacher drop to cell awaiting teacher
        if (type === 'TEACHER' && status === 'AWAITING_TEACHER') {
            // Verify the teacher is being dropped on the correct target cell
            if (targetCellKey === cellKey) {
                dispatch(setTeacherToCell({ cellKey, teacher: item as Teacher }));
            }
        }
    }, [dispatch]);

    const handleSaveDraft = () => {
        const payload = {
            class: selectedClass,
            section: selectedSection,
            grid: Object.entries(grid).reduce((acc, [key, value]) => {
                if (value.status !== 'EMPTY') {
                    acc[key] = value;
                }
                return acc;
            }, {} as typeof grid),
        };
        console.log('Save Draft Payload:', payload);
        alert('Draft saved! Check console for payload.');
    };

    const handlePublish = () => {
        const payload = {
            class: selectedClass,
            section: selectedSection,
            grid: Object.entries(grid).reduce((acc, [key, value]) => {
                if (value.status !== 'EMPTY') {
                    acc[key] = value;
                }
                return acc;
            }, {} as typeof grid),
        };
        console.log('Publish Payload:', payload);
        alert('Timetable published! Check console for payload.');
    };

    const handleReset = () => {
        if (window.confirm('Are you sure you want to reset the timetable? All changes will be lost.')) {
            dispatch(resetGrid());
        }
    };

    // Helper to find subject by name
    const findSubjectByName = (name: string): Subject | undefined => {
        return initialSubjects.find(s => s.name.toLowerCase() === name.toLowerCase());
    };

    // Helper to find teacher by name
    const findTeacherByName = (name: string): Teacher | undefined => {
        return initialTeachers.find(t => t.name.toLowerCase() === name.toLowerCase());
    };

    // Animate filling the grid with LLM response
    const animateFillGrid = async (timetable: GeneratedTimetable) => {
        const days: (keyof GeneratedTimetable)[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00'];

        // First reset the grid
        dispatch(resetGrid());

        // Wait a moment for reset animation
        await new Promise(resolve => setTimeout(resolve, 300));

        // Iterate through each day and period with animation delay
        for (const day of days) {
            const periods = timetable[day];
            if (!periods) continue;

            for (const periodData of periods) {
                const timeSlotIndex = periodData.period - 1;
                if (timeSlotIndex < 0 || timeSlotIndex >= timeSlots.length) continue;

                const timeSlot = timeSlots[timeSlotIndex];
                const cellKey = `${day}_${timeSlot}`;

                const subject = findSubjectByName(periodData.subject);
                const teacher = findTeacherByName(periodData.teacher);

                if (subject) {
                    // First add subject with animation
                    dispatch(setSubjectToCell({ cellKey, subject }));
                    await new Promise(resolve => setTimeout(resolve, 100));

                    if (teacher) {
                        // Then add teacher with animation
                        dispatch(setTeacherToCell({ cellKey, teacher }));
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
            }
        }
    };

    // Handle auto generate
    const handleAutoGenerate = async (query: string) => {
        setIsGenerating(true);
        setAutoGenerateError(null);

        try {
            // Transform subjects and teachers for LLM API
            const subjects = initialSubjects.map(s => s.name);
            const teachers: LLMTeacher[] = initialTeachers.map(t => ({
                name: t.name,
                subjects: t.teachableSubjects.map(subId => {
                    const subject = initialSubjects.find(s => s._id === subId);
                    return subject?.name || '';
                }).filter(Boolean),
            }));

            const response = await generateTimetable({
                subjects,
                teachers,
                subjects_per_day: 6,
                user_query: query,
            });

            if (response.success) {
                // Close modal and animate grid filling
                setIsAutoGenerateModalOpen(false);
                await animateFillGrid(response.timetable);
            } else {
                // Show error in modal
                if (response.error.includes('constraint') || response.error.includes('cannot be satisfied')) {
                    setAutoGenerateError(`Timetable cannot be created with these constraints: ${response.error}. Please try with different constraints or create the timetable manually.`);
                } else {
                    setAutoGenerateError(response.error);
                }
            }
        } catch (error) {
            setAutoGenerateError('Cannot generate timetable due to some error. Please try again later.');
        } finally {
            setIsGenerating(false);
        }
    };

    const openAutoGenerateModal = () => {
        setAutoGenerateError(null);
        setIsAutoGenerateModalOpen(true);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="min-h-screen bg-background">
                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border"
                >
                    <div className="container mx-auto px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => navigate('/timetable')}
                                    className="shrink-0"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                                <div>
                                    <h1 className="text-lg font-semibold text-foreground">
                                        Timetable Editor
                                    </h1>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedClass?.name || 'Class'} - {selectedSection?.name || 'Section'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    onClick={openAutoGenerateModal}
                                    className="ai-glow-button gap-2"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Auto Generate
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleReset}
                                    className="gap-2"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Reset
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSaveDraft}
                                    className="gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Save Draft
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handlePublish}
                                    className="gap-2"
                                >
                                    <Send className="w-4 h-4" />
                                    Publish
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.header>

                {/* Main Content - 3 Column Layout */}
                <div className="container mx-auto px-4 py-6">
                    <div className="grid grid-cols-[260px_1fr_260px] gap-6 min-h-[calc(100vh-120px)]">
                        {/* Left Sidebar - Subjects */}
                        <motion.aside
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <SidebarSubjects />
                        </motion.aside>

                        {/* Center - Timetable Grid */}
                        <motion.main
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-card/30 rounded-xl p-4 border border-border/50"
                        >
                            <TimetableGrid />
                        </motion.main>

                        {/* Right Sidebar - Teachers */}
                        <motion.aside
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <SidebarTeachers />
                        </motion.aside>
                    </div>
                </div>

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeDragItem && (
                        <div className="p-3 rounded-lg bg-card border border-primary shadow-2xl">
                            <span className="text-sm font-medium">
                                {(activeDragItem.item as Subject).name || (activeDragItem.item as Teacher).name}
                            </span>
                        </div>
                    )}
                </DragOverlay>

                {/* Auto Generate Modal */}
                <AutoGenerateModal
                    open={isAutoGenerateModalOpen}
                    onOpenChange={setIsAutoGenerateModalOpen}
                    onGenerate={handleAutoGenerate}
                    isGenerating={isGenerating}
                    error={autoGenerateError}
                />
            </div>
        </DndContext>
    );
}
