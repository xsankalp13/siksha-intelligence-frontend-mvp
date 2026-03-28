import { useDroppable } from '@dnd-kit/core';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import type { GridCellData } from '../types';
import type { RootState } from '@/store/store';
import { setActiveCell, clearCell } from '../store/timetableSlice';
import { BookOpen, User, Lock, X, Coffee, Clock, Pencil, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GridCellProps {
    cellKey: string;
    cellData: GridCellData;
    readOnly?: boolean;
    isUndefined?: boolean;
    isBreak?: boolean;
    isNonTeaching?: boolean;
    slotLabel?: string;
    onEditCell?: (cellKey: string) => void;
    roomName?: string;
    commonRoomId?: string;
}

export function GridCell({
    cellKey,
    cellData,
    readOnly = false,
    isUndefined = false,
    isBreak = false,
    isNonTeaching = false,
    slotLabel,
    onEditCell,
    roomName,
    commonRoomId,
}: GridCellProps) {
    const dispatch = useDispatch();
    const activeCell = useSelector((state: RootState) => state.timetable.activeCell);
    const isActive = activeCell === cellKey;

    const status = cellData?.status || 'EMPTY';

    const { isOver, setNodeRef } = useDroppable({
        id: cellKey,
        disabled: readOnly || status === 'LOCKED' || isUndefined || isBreak || isNonTeaching,
        data: {
            cellKey,
            status,
        },
    });

    const handleClick = () => {
        if (status === 'AWAITING_TEACHER') {
            dispatch(setActiveCell(isActive ? null : cellKey));
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        dispatch(clearCell(cellKey));
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEditCell?.(cellKey);
    };

    const getCellStyles = () => {
        const baseStyles = 'relative min-h-[70px] p-1.5 rounded-lg transition-all duration-200 border-2';

        if (status === 'LOCKED') {
            return `${baseStyles} group/locked bg-accent/30 border-primary/30 cursor-default hover:border-primary/60 hover:bg-accent/50`;
        }

        if (status === 'AWAITING_TEACHER') {
            return `${baseStyles} bg-primary/5 cursor-pointer ${isActive
                ? 'border-primary ring-2 ring-primary/20 shadow-md'
                : 'border-primary/50 hover:border-primary hover:shadow-sm'
                }`;
        }

        // EMPTY
        return `${baseStyles} border-dashed ${isUndefined ? 'bg-muted/10 border-transparent opacity-30 cursor-not-allowed' : (isOver
            ? 'bg-primary/10 border-primary'
            : 'bg-muted/20 border-border hover:border-primary/30 hover:bg-muted/40')
            }`;
    };

    const isSystemSlot = isBreak || isNonTeaching;

    return (
        <motion.div
            ref={setNodeRef}
            onClick={handleClick}
            className={cn(
                getCellStyles(),
                cellData?.isNew && "ring-4 ring-violet-500/30 border-violet-500 shadow-lg shadow-violet-500/20"
            )}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
                opacity: 1,
                scale: cellData?.isNew ? 1.05 : (isOver ? 1.02 : 1),
                boxShadow: cellData?.isNew 
                    ? "0 0 20px rgba(139, 92, 246, 0.3)" 
                    : "0 0 0px rgba(0, 0, 0, 0)"
            }}
            transition={{ 
                duration: cellData?.isNew ? 0.4 : 0.15,
                repeat: cellData?.isNew ? 1 : 0,
                repeatType: "reverse"
            }}
        >
            <AnimatePresence mode="wait">
                {isSystemSlot ? (
                    <motion.div
                        key="system"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-full flex flex-col items-center justify-center p-1 bg-muted/30 rounded-md"
                    >
                        <div className="flex flex-col items-center gap-1.5 opacity-60">
                            {isBreak ? (
                                <Coffee className="w-4 h-4 text-orange-500" />
                            ) : (
                                <Clock className="w-4 h-4 text-primary" />
                            )}
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center">
                                {slotLabel || (isBreak ? 'BREAK' : 'OTHERS')}
                            </span>
                        </div>
                    </motion.div>
                ) : (
                    <>
                        {status === 'EMPTY' && (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="h-full flex items-center justify-center p-1"
                            >
                                <span className="text-[10px] text-muted-foreground/40 text-center leading-tight">
                                    {isUndefined ? '-' : 'Drop subject'}
                                </span>
                            </motion.div>
                        )}

                        {status === 'AWAITING_TEACHER' && cellData?.subject && (
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
                                        <span className="text-[11px] font-bold text-foreground truncate max-w-[80px]">
                                            {cellData.subject.name}
                                        </span>
                                    </div>
                                    {!readOnly && (
                                        <button
                                            onClick={handleClear}
                                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1 flex items-center justify-center">
                                    <span className="text-[9px] text-muted-foreground animate-pulse text-center">
                                        {isActive ? 'Drop teacher' : 'Assign teacher'}
                                    </span>
                                </div>
                            </motion.div>
                        )}

                        {status === 'LOCKED' && cellData?.subject && (
                            <motion.div
                                key="locked"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="h-full flex flex-col gap-0.5"
                            >
                                {/* Subject row */}
                                <div className="flex items-center gap-1">
                                    <BookOpen className="w-3 h-3 text-primary flex-shrink-0" />
                                    <span className="text-[11px] font-bold truncate text-foreground flex-1 min-w-0">
                                        {cellData.subject.name}
                                    </span>
                                </div>

                                {/* Teacher row */}
                                {cellData.teacher && (
                                    <div className="flex items-center gap-1">
                                        <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                        <span className="text-[10px] text-muted-foreground truncate flex-1 min-w-0">
                                            {cellData.teacher.name}
                                        </span>
                                    </div>
                                )}

                                {/* Room row (if assigned and differs from common room) */}
                                {roomName && cellData.roomId !== commonRoomId && (
                                    <motion.div 
                                       initial={{ opacity: 0, scale: 0.9 }}
                                       animate={{ opacity: 1, scale: 1 }}
                                       className={cn(
                                        "flex items-center gap-1 mt-0.5 px-1 py-0.5 rounded bg-violet-100 border border-violet-200 shadow-sm"
                                       )}
                                    >
                                        <MapPin className="w-2.5 h-2.5 text-violet-600 flex-shrink-0" />
                                        <span className="text-[9px] font-black text-violet-700 truncate uppercase tracking-tight">
                                            {roomName}
                                        </span>
                                    </motion.div>
                                )}

                                {/* Lock icon (bottom-right) */}
                                <div className="absolute top-1 right-1 flex items-center gap-1">
                                    <Lock className="w-2.5 h-2.5 text-muted-foreground/20" />
                                </div>

                                {/* Edit button - appears on hover */}
                                {!readOnly && onEditCell && (
                                    <button
                                        onClick={handleEdit}
                                        className={cn(
                                            "absolute bottom-1 right-1 p-1 rounded-md",
                                            "opacity-0 group-hover/locked:opacity-100 transition-all duration-150",
                                            "bg-primary/10 hover:bg-primary/20 text-primary",
                                            "shadow-sm"
                                        )}
                                        title="Edit this period"
                                    >
                                        <Pencil className="w-2.5 h-2.5" />
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
