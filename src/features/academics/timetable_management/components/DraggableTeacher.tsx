import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import type { Teacher } from '../types';
import { User } from 'lucide-react';

interface DraggableTeacherProps {
    teacher: Teacher;
    isEnabled: boolean;
    targetCellKey: string | null;
}

export function DraggableTeacher({ teacher, isEnabled, targetCellKey }: DraggableTeacherProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `teacher-${teacher._id}`,
        disabled: !isEnabled,
        data: {
            type: 'TEACHER',
            item: teacher,
            targetCellKey,
        },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
    };

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            {...(isEnabled ? { ...listeners, ...attributes } : {})}
            initial={{ opacity: 0, y: 10 }}
            animate={{
                opacity: isEnabled ? 1 : 0.4,
                y: 0,
                scale: isEnabled ? 1 : 0.98,
            }}
            whileHover={isEnabled ? { scale: 1.02 } : {}}
            whileTap={isEnabled ? { scale: 0.98 } : {}}
            transition={{ duration: 0.2 }}
            className={`
        p-3 rounded-lg border transition-all duration-200 select-none
        ${isEnabled
                    ? 'cursor-grab active:cursor-grabbing bg-card hover:bg-accent/50 border-border hover:border-primary/50 hover:shadow-md'
                    : 'cursor-not-allowed bg-muted/30 border-border/50'
                }
        ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary/30' : ''}
      `}
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-md ${isEnabled ? 'bg-primary/10' : 'bg-muted'}`}>
                    <User className={`w-4 h-4 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isEnabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {teacher.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {teacher.teachableSubjects.length} subject{teacher.teachableSubjects.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
