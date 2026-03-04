import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { GridCell } from './GridCell';
import { DAYS, TIME_SLOTS } from '../types';
import type { RootState } from '@/store/store';

export function TimetableGrid() {
    const grid = useSelector((state: RootState) => state.timetable.grid);

    return (
        <div className="w-full overflow-x-auto">
            <div className="min-w-[900px]">
                {/* Grid Header - Days */}
                <div className="grid grid-cols-[80px_repeat(6,1fr)] gap-2 mb-2">
                    <div className="p-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Time
                    </div>
                    {DAYS.map((day, index) => (
                        <motion.div
                            key={day}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-2 text-center text-sm font-semibold text-foreground bg-accent/30 rounded-lg"
                        >
                            {day}
                        </motion.div>
                    ))}
                </div>

                {/* Grid Body - Time Slots */}
                {TIME_SLOTS.map((time, rowIndex) => (
                    <motion.div
                        key={time}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: rowIndex * 0.03 }}
                        className="grid grid-cols-[80px_repeat(6,1fr)] gap-2 mb-2"
                    >
                        {/* Time Label */}
                        <div className="p-2 flex items-center justify-center">
                            <span className="text-xs font-medium text-muted-foreground">
                                {time}
                            </span>
                        </div>

                        {/* Day Cells */}
                        {DAYS.map((day) => {
                            const cellKey = `${day}_${time}`;
                            const cellData = grid[cellKey];

                            return (
                                <GridCell
                                    key={cellKey}
                                    cellKey={cellKey}
                                    cellData={cellData}
                                />
                            );
                        })}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
