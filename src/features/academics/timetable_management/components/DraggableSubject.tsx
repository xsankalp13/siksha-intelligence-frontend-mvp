import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import type { Subject } from '../types';
import { BookOpen } from 'lucide-react';

interface DraggableSubjectProps {
    subject: Subject;
}

export function DraggableSubject({ subject }: DraggableSubjectProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `subject-${subject._id}`,
        data: {
            type: 'SUBJECT',
            item: subject,
        },
    });

    const style = {
        transform: CSS.Translate.toString(transform),
    };

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
        p-3 rounded-lg border cursor-grab active:cursor-grabbing
        transition-all duration-200 select-none
        bg-card hover:bg-accent/50
        border-border hover:border-primary/50
        hover:shadow-md
        ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary/30' : ''}
      `}
        >
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                    <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                        {subject.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {subject.code}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
