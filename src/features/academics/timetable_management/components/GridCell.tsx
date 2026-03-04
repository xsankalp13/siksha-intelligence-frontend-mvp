import { useDroppable } from '@dnd-kit/core';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import type { GridCellData } from '../types';
import type { RootState } from '@/store/store';
import { setActiveCell, clearCell } from '../store/timetableSlice';
import { BookOpen, User, Lock, X } from 'lucide-react';

interface GridCellProps {
    cellKey: string;
    cellData: GridCellData;
}

export function GridCell({ cellKey, cellData }: GridCellProps) {
    const dispatch = useDispatch();
    const activeCell = useSelector((state: RootState) => state.timetable.activeCell);
    const isActive = activeCell === cellKey;


    const { isOver, setNodeRef } = useDroppable({
        id: cellKey,
        disabled: cellData.status === 'LOCKED',
        data: {
            cellKey,
            status: cellData.status,
        },
    });

    const handleClick = () => {
        if (cellData.status === 'AWAITING_TEACHER') {
            dispatch(setActiveCell(isActive ? null : cellKey));
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch(clearCell(cellKey));
    };

    const getCellStyles = () => {
        const baseStyles = 'relative min-h-[80px] p-2 rounded-lg transition-all duration-200 border-2';

        if (cellData.status === 'LOCKED') {
            return `${baseStyles} bg-accent/30 border-primary/30 cursor-default`;
        }

        if (cellData.status === 'AWAITING_TEACHER') {
            return `${baseStyles} bg-primary/5 cursor-pointer ${isActive
                ? 'border-primary ring-2 ring-primary/20 shadow-md'
                : 'border-primary/50 hover:border-primary hover:shadow-sm'
                }`;
        }

        // EMPTY
        return `${baseStyles} border-dashed ${isOver
            ? 'bg-primary/10 border-primary'
            : 'bg-muted/20 border-border hover:border-primary/30 hover:bg-muted/40'
            }`;
    };

    return (
        <motion.div
            ref={setNodeRef}
            onClick={handleClick}
            className={getCellStyles()}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
                opacity: 1,
                scale: isOver ? 1.02 : 1,
            }}
            transition={{ duration: 0.15 }}
        >
            <AnimatePresence mode="wait">
                {cellData.status === 'EMPTY' && (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full flex items-center justify-center"
                    >
                        <span className="text-xs text-muted-foreground/50">
                            Drop subject
                        </span>
                    </motion.div>
                )}

                {cellData.status === 'AWAITING_TEACHER' && cellData.subject && (
                    <motion.div
                        key="awaiting"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="h-full flex flex-col"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3 text-primary" />
                                <span className="text-xs font-medium text-foreground truncate max-w-[100px]">
                                    {cellData.subject.name}
                                </span>
                            </div>
                            <button
                                onClick={handleClear}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                            <span className="text-xs text-muted-foreground animate-pulse">
                                {isActive ? 'Drop teacher here' : 'Click to assign teacher'}
                            </span>
                        </div>
                    </motion.div>
                )}

                {cellData.status === 'LOCKED' && cellData.subject && cellData.teacher && (
                    <motion.div
                        key="locked"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full flex flex-col gap-1"
                    >
                        <div className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-primary" />
                            <span className="text-xs font-medium text-foreground truncate">
                                {cellData.subject.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate">
                                {cellData.teacher.name}
                            </span>
                        </div>
                        <div className="absolute top-1 right-1">
                            <Lock className="w-3 h-3 text-primary/50" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
