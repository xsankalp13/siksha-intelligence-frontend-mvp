import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { GridCell } from './GridCell';
import type { RootState } from '@/store/store';
import { useGetEditorContext } from '../queries/useTimetableQueries';
import { Loader2, CalendarX, Copy, ChevronRight } from 'lucide-react';
import { cloneDay } from '../store/timetableSlice';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DAYS_NAME = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const normalizeTime = (time: string) => {
    if (!time) return '';
    const parts = time.split(':');
    const hours = parts[0].trim().padStart(2, '0');
    const minutes = (parts[1] || '0').trim().padStart(2, '0');
    return `${hours}:${minutes}`;
};

export function TimetableGrid({ readOnly = false, sectionId, rooms = [], onEditCell }: { 
    readOnly?: boolean; 
    sectionId?: string;
    rooms?: Array<{ uuid: string; name: string; roomType?: string }>;
    onEditCell?: (cellKey: string) => void;
}) {
    const dispatch = useDispatch();
    const { selectedSection, grid } = useSelector((state: RootState) => state.timetable);
    const sectionIdToUse = sectionId || selectedSection?._id;
    const { data: editorContext, isLoading } = useGetEditorContext(sectionIdToUse);

    // Derive dynamic days and time slots from the context
    const { days, timeSlotObjects } = (editorContext?.timeslots || []).reduce((acc, ts) => {
        const dayName = DAYS_NAME[ts.dayOfWeek - 1] || 'Monday';
        if (!acc.days.includes(dayName)) acc.days.push(dayName);
        
        const startStr = normalizeTime(ts.startTime);
        const endStr = normalizeTime(ts.endTime);
        const displayLabel = `${startStr} - ${endStr}`;
        
        if (!acc.timeSlotObjects.some(t => t.start === startStr)) {
            acc.timeSlotObjects.push({ start: startStr, display: displayLabel });
        }
        
        return acc;
    }, { days: [] as string[], timeSlotObjects: [] as {start: string, display: string}[] });

    // Sort days and times
    days.sort((a, b) => DAYS_NAME.indexOf(a) - DAYS_NAME.indexOf(b));
    
    // Filter days based on teaching status (e.g. hide Sunday if empty or all non-teaching)
    const visibleDays = days.filter(day => {
        // If it's Sunday, we only show it if it has at least one active TEACHING slot
        if (day === 'Sunday') {
            const daySlots = (editorContext?.timeslots || []).filter(ts => 
                (DAYS_NAME[ts.dayOfWeek - 1] === 'Sunday')
            );
            return daySlots.some(ts => !ts.isNonTeachingSlot && !ts.isBreak);
        }
        return true;
    });

    timeSlotObjects.sort((a, b) => a.start.localeCompare(b.start));

    // Use the backend-provided default room for this section
    const commonRoomId = selectedSection?.defaultRoom?.uuid || '';
    const commonRoomName = selectedSection?.defaultRoom?.name;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
                <p className="text-muted-foreground animate-pulse">Building your grid...</p>
            </div>
        );
    }

    const columnWidth = "150px";
    const labelWidth = "120px";

    if (days.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
                <div className="p-4 rounded-full bg-accent">
                    <CalendarX className="w-12 h-12 text-muted-foreground" />
                </div>
                <div>
                    <h3 className="text-xl font-bold">No Timeslots Defined</h3>
                    <p className="text-muted-foreground max-w-xs">
                        Please define timeslots for this section in the Management UI first.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto custom-scrollbar">
            {/* Header info bar for common room */}
            {commonRoomName && (
                <div className="mb-4 flex items-center gap-2 px-1">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Main Classroom</span>
                        <span className="text-xs font-black text-blue-900 ml-1">{commonRoomName}</span>
                    </div>
                </div>
            )}

            <div className="min-w-[max-content] pb-2">
                {/* Grid Header - Days */}
                <div className="grid gap-2 mb-2" style={{ 
                    gridTemplateColumns: `${labelWidth} repeat(${visibleDays.length}, ${columnWidth})` 
                }}>
                    <div className="p-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/30 rounded-lg flex items-center justify-center">
                        Schedule
                    </div>
                    {visibleDays.map((day, index) => (
                        <motion.div
                            key={day}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-2 text-center text-xs font-bold text-foreground bg-primary/5 border border-primary/10 rounded-lg shadow-sm flex items-center justify-between group"
                        >
                            <span className="flex-1 text-center pl-4">{day}</span>
                            {!readOnly && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="p-1 hover:bg-primary/10 rounded transition-all text-primary/40 hover:text-primary">
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                                            Clone {day} to...
                                        </div>
                                        {days.filter(d => d !== day).map(otherDay => (
                                            <DropdownMenuItem 
                                                key={otherDay}
                                                onClick={() => {
                                                    dispatch(cloneDay({ sourceDay: day, targetDay: otherDay }));
                                                    toast.success(`Schedule cloned to ${otherDay}`);
                                                }}
                                                className="flex items-center gap-2"
                                            >
                                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                                <span>{otherDay}</span>
                                            </DropdownMenuItem>
                                        ))}
                                        <div className="border-t mt-1" />
                                        <DropdownMenuItem 
                                            onClick={() => {
                                                visibleDays.filter(d => d !== day).forEach(otherDay => {
                                                    dispatch(cloneDay({ sourceDay: day, targetDay: otherDay }));
                                                });
                                                toast.success(`Schedule cloned to all days from ${day}`);
                                            }}
                                            className="text-primary font-medium"
                                        >
                                            Clone to all other days
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Grid Body - Time Slots */}
                {timeSlotObjects.map((ts, rowIndex) => (
                    <motion.div
                        key={ts.start}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: rowIndex * 0.03 }}
                        className="grid gap-2 mb-2"
                        style={{ 
                            gridTemplateColumns: `${labelWidth} repeat(${visibleDays.length}, ${columnWidth})` 
                        }}
                    >
                        {/* Time Label */}
                        <div className="p-2 flex items-center justify-center bg-muted/20 rounded-lg border border-border/50">
                            <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                                {ts.display}
                            </span>
                        </div>

                        {/* Day Cells */}
                        {visibleDays.map((day) => {
                            const cellKey = `${day}_${ts.start}`;
                            const matchingSlot = editorContext?.timeslots.find(slot => {
                                const d = DAYS_NAME[slot.dayOfWeek - 1] || 'Monday';
                                return d === day && normalizeTime(slot.startTime) === ts.start;
                            });

                            return (
                                <GridCell
                                    key={cellKey}
                                    cellKey={cellKey}
                                    cellData={grid[cellKey]}
                                    readOnly={readOnly}
                                    isUndefined={!matchingSlot}
                                    isBreak={matchingSlot?.isBreak}
                                    isNonTeaching={matchingSlot?.isNonTeachingSlot}
                                    slotLabel={matchingSlot?.slotLabel}
                                    onEditCell={!readOnly ? onEditCell : undefined}
                                    roomName={rooms.find(r => r.uuid === grid[cellKey]?.roomId)?.name}
                                    commonRoomId={commonRoomId}
                                />
                            );
                        })}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
