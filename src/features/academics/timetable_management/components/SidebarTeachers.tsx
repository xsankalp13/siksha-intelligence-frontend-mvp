import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DraggableTeacher } from './DraggableTeacher';
import type { RootState } from '@/store/store';
import { Users } from 'lucide-react';
import type { Teacher } from '../types';
import { useGetEditorContext, useGetAvailableTeachers } from '../queries/useTimetableQueries';

const normalizeTime = (time: string) => {
    if (!time) return '';
    const parts = time.split(':');
    const hours = parts[0].trim().padStart(2, '0');
    const minutes = (parts[1] || '0').trim().padStart(2, '0');
    return `${hours}:${minutes}`;
};

interface SidebarTeachersProps {
    teachers: Teacher[];
    isLoading: boolean;
}

export function SidebarTeachers({ teachers, isLoading }: SidebarTeachersProps) {
    const { activeCell, grid, selectedSection } = useSelector((state: RootState) => state.timetable);
    const { data: context } = useGetEditorContext(selectedSection?._id);

    // Get the subject ID of the active cell (if any)
    const activeCellData = activeCell ? grid[activeCell] : null;
    const activeSubjectId = activeCellData?.subject?._id || null;

    // Find the timeslot ID for the active cell
    const activeTimeslotId = useMemo(() => {
        if (!activeCell || !context) return undefined;
        const [dayName, startTime] = activeCell.split('_');
        const DAYS_LIST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const dayOfWeek = DAYS_LIST.indexOf(dayName) + 1;
        const normalizedTarget = startTime;
        
        return context.timeslots.find(ts => 
            ts.dayOfWeek === dayOfWeek && 
            normalizeTime(ts.startTime) === normalizedTarget
        )?.uuid;
    }, [activeCell, context]);

    // Fetch available teachers for this specific slot from the API
    const { data: availableTeacherData, isLoading: isAvailabilityLoading } = useGetAvailableTeachers(
        activeSubjectId || undefined,
        selectedSection?._id,
        activeTimeslotId
    );

    // Filter teachers based on whether they can teach the active subject AND are available for the slot
    const getTeacherState = (teacher: Teacher) => {
        if (!activeSubjectId) return { isEnabled: false };
        
        const canTeach = teacher.teachableSubjects.includes(activeSubjectId);
        
        // If we have API data for availability, use it as the source of truth
        const isAvailableForSlot = availableTeacherData 
            ? availableTeacherData.some(at => String(at.id) === teacher._id)
            : true; // Default to true if not yet loaded
            
        return {
            isEnabled: canTeach && isAvailableForSlot,
        };
    };

    const teachersToDisplay = useMemo(() => {
        return teachers
            .map(t => ({
                ...t,
                ...getTeacherState(t)
            }))
            .filter(t => !activeSubjectId || t.isEnabled); // Hide if a subject is selected and teacher is not available/teachable
    }, [teachers, activeSubjectId, availableTeacherData]);

    const enabledCount = teachersToDisplay.length;

    return (
        <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Teachers
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                    {isLoading
                        ? 'Loading...'
                        : activeSubjectId
                            ? `${enabledCount} teacher${enabledCount !== 1 ? 's' : ''} available`
                            : 'Select a cell with subject first'
                    }
                </p>
            </CardHeader>
            <CardContent className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
                {isLoading || isAvailabilityLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full rounded-lg" />
                    ))
                    : teachersToDisplay.map((teacher, index) => {
                        return (
                            <motion.div
                                key={teacher._id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="relative group"
                            >
                                <DraggableTeacher
                                    teacher={teacher}
                                    isEnabled={teacher.isEnabled}
                                    targetCellKey={activeCell}
                                />
                            </motion.div>
                        );
                    })
                }
            </CardContent>
        </Card>
    );
}
