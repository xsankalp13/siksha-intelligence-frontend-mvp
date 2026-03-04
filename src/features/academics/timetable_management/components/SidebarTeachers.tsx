import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DraggableTeacher } from './DraggableTeacher';
import { initialTeachers } from '../data/mockData';
import type { RootState } from '@/store/store';
import { Users } from 'lucide-react';

export function SidebarTeachers() {
    const { activeCell, grid } = useSelector((state: RootState) => state.timetable);

    // Get the subject ID of the active cell (if any)
    const activeCellData = activeCell ? grid[activeCell] : null;
    const activeSubjectId = activeCellData?.subject?._id || null;

    // Filter teachers based on whether they can teach the active subject
    const getTeacherState = (teacherId: string) => {
        const teacher = initialTeachers.find(t => t._id === teacherId);
        if (!teacher || !activeSubjectId) return { isEnabled: false };
        return {
            isEnabled: teacher.teachableSubjects.includes(activeSubjectId),
        };
    };

    const enabledCount = initialTeachers.filter(
        t => activeSubjectId && t.teachableSubjects.includes(activeSubjectId)
    ).length;

    return (
        <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Teachers
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                    {activeSubjectId
                        ? `${enabledCount} teacher${enabledCount !== 1 ? 's' : ''} available`
                        : 'Select a cell with subject first'
                    }
                </p>
            </CardHeader>
            <CardContent className="space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
                {initialTeachers.map((teacher, index) => {
                    const { isEnabled } = getTeacherState(teacher._id);
                    return (
                        <motion.div
                            key={teacher._id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <DraggableTeacher
                                teacher={teacher}
                                isEnabled={isEnabled}
                                targetCellKey={activeCell}
                            />
                        </motion.div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
