import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
    TimetableState,
    GridState,
    Subject,
    Teacher,
    ClassData,
    Section
} from '../types';
import { DAYS, TIME_SLOTS } from '../types';

// Initialize empty grid
const createEmptyGrid = (): GridState => {
    const grid: GridState = {};
    DAYS.forEach(day => {
        TIME_SLOTS.forEach(time => {
            grid[`${day}_${time}`] = {
                subject: null,
                teacher: null,
                status: 'EMPTY',
                roomId: null,
            };
        });
    });
    return grid;
};

const initialState: TimetableState = {
    selectedClass: null,
    selectedSection: null,
    grid: createEmptyGrid(),
    activeCell: null,
};

const timetableSlice = createSlice({
    name: 'timetable',
    initialState,
    reducers: {
        setSelectedClass: (state, action: PayloadAction<ClassData | null>) => {
            state.selectedClass = action.payload;
        },
        setSelectedSection: (state, action: PayloadAction<Section | null>) => {
            state.selectedSection = action.payload;
        },
        setActiveCell: (state, action: PayloadAction<string | null>) => {
            state.activeCell = action.payload;
        },
        setSubjectToCell: (state, action: PayloadAction<{ cellKey: string; subject: Subject; roomId?: string | null }>) => {
            const { cellKey, subject, roomId = null } = action.payload;
            const current = state.grid[cellKey];
            if (!current || current.status === 'EMPTY') {
                state.grid[cellKey] = {
                    subject,
                    teacher: null,
                    status: 'AWAITING_TEACHER',
                    roomId,
                };
                state.activeCell = cellKey;
            }
        },
        setTeacherToCell: (state, action: PayloadAction<{ cellKey: string; teacher: Teacher }>) => {
            const { cellKey, teacher } = action.payload;
            const current = state.grid[cellKey];
            if (current && current.status === 'AWAITING_TEACHER') {
                state.grid[cellKey] = {
                    ...current,
                    teacher,
                    status: 'LOCKED'
                };
                state.activeCell = null;
            }
        },
        /** Directly edit a LOCKED cell's subject, teacher, and/or room */
        editCell: (state, action: PayloadAction<{
            cellKey: string;
            subject: Subject;
            teacher: Teacher;
            roomId: string | null;
        }>) => {
            const { cellKey, subject, teacher, roomId } = action.payload;
            state.grid[cellKey] = {
                subject,
                teacher,
                status: 'LOCKED',
                roomId,
            };
        },
        /** Set room for a specific cell */
        setCellRoom: (state, action: PayloadAction<{ cellKey: string; roomId: string | null }>) => {
            const { cellKey, roomId } = action.payload;
            if (state.grid[cellKey]) {
                state.grid[cellKey] = { ...state.grid[cellKey], roomId };
            }
        },
        clearCell: (state, action: PayloadAction<string>) => {
            const cellKey = action.payload;
            if (state.grid[cellKey]) {
                state.grid[cellKey] = {
                    subject: null,
                    teacher: null,
                    status: 'EMPTY',
                    roomId: null,
                };
                if (state.activeCell === cellKey) {
                    state.activeCell = null;
                }
            }
        },
        resetGrid: (state) => {
            state.grid = createEmptyGrid();
            state.activeCell = null;
        },
        overwriteCell: (state, action: PayloadAction<{ cellKey: string; data: any }>) => {
            state.grid[action.payload.cellKey] = action.payload.data;
        },
        setIsGenerating: (state, action: PayloadAction<boolean>) => {
            state.isGenerating = action.payload;
        },
        applyGeneratedSchedule: (state, action: PayloadAction<{ 
            schedules: any[]; 
            timeslots: any[];
        }>) => {
            const { schedules, timeslots } = action.payload;
            const DAYS_LIST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            
            schedules.forEach(s => {
                const ts = timeslots.find(t => t.uuid === s.timeslot.uuid);
                if (ts) {
                    const dayName = DAYS_LIST[ts.dayOfWeek - 1] || 'Monday';
                    const timeStr = ts.startTime.substring(0, 5);
                    const cellKey = `${dayName}_${timeStr}`;
                    
                    state.grid[cellKey] = {
                        subject: { 
                            _id: s.subject.uuid, 
                            name: s.subject.name, 
                            code: s.subject.subjectCode,
                            color: s.subject.color 
                        },
                        teacher: { 
                            _id: s.teacher.id, 
                            name: s.teacher.name 
                        } as any,
                        status: 'LOCKED',
                        roomId: s.room?.uuid || null,
                        isNew: true // For animation
                    };
                }
            });
        },
        cloneDay: (state, action: PayloadAction<{ sourceDay: string; targetDay: string }>) => {
            const { sourceDay, targetDay } = action.payload;
            Object.keys(state.grid).forEach(key => {
                if (key.startsWith(`${sourceDay}_`)) {
                    const parts = key.split('_');
                    if (parts.length < 2) return;

                    const time = parts.slice(1).join('_');
                    const targetKey = `${targetDay}_${time}`;
                    const sourceCell = state.grid[key];

                    if (sourceCell && sourceCell.status !== 'EMPTY') {
                        if (sourceCell.subject?._id !== 'break') {
                            state.grid[targetKey] = { ...sourceCell };
                        }
                    }
                }
            });
        },
        /** Place subject into a cell (first step of animated fill) */
        fillCellSubject: (state, action: PayloadAction<{ cellKey: string; subject: Subject }>) => {
            const { cellKey, subject } = action.payload;
            state.grid[cellKey] = {
                subject,
                teacher: null,
                status: 'AWAITING_TEACHER',
                roomId: null,
                isNew: true,
            };
        },
        /** Place teacher into a cell that already has a subject (second step of animated fill) */
        fillCellTeacher: (state, action: PayloadAction<{ cellKey: string; teacher: Teacher }>) => {
            const { cellKey, teacher } = action.payload;
            const current = state.grid[cellKey];
            if (current && current.subject) {
                state.grid[cellKey] = {
                    ...current,
                    teacher,
                    status: 'LOCKED',
                    isNew: true,
                };
            }
        },
        /** Clear all isNew flags after animation completes */
        clearIsNewFlags: (state) => {
            Object.keys(state.grid).forEach(key => {
                if (state.grid[key]?.isNew) {
                    state.grid[key] = { ...state.grid[key], isNew: false };
                }
            });
        },
    },
});

export const {
    setSelectedClass,
    setSelectedSection,
    setActiveCell,
    setSubjectToCell,
    setTeacherToCell,
    editCell,
    setCellRoom,
    clearCell,
    resetGrid,
    overwriteCell,
    cloneDay,
    setIsGenerating,
    applyGeneratedSchedule,
    fillCellSubject,
    fillCellTeacher,
    clearIsNewFlags,
} = timetableSlice.actions;

export const timetableReducer = timetableSlice.reducer;
