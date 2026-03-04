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
                status: 'EMPTY'
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
        setSubjectToCell: (state, action: PayloadAction<{ cellKey: string; subject: Subject }>) => {
            const { cellKey, subject } = action.payload;
            if (state.grid[cellKey] && state.grid[cellKey].status === 'EMPTY') {
                state.grid[cellKey] = {
                    subject,
                    teacher: null,
                    status: 'AWAITING_TEACHER'
                };
                state.activeCell = cellKey;
            }
        },
        setTeacherToCell: (state, action: PayloadAction<{ cellKey: string; teacher: Teacher }>) => {
            const { cellKey, teacher } = action.payload;
            if (state.grid[cellKey] && state.grid[cellKey].status === 'AWAITING_TEACHER') {
                state.grid[cellKey] = {
                    ...state.grid[cellKey],
                    teacher,
                    status: 'LOCKED'
                };
                state.activeCell = null;
            }
        },
        clearCell: (state, action: PayloadAction<string>) => {
            const cellKey = action.payload;
            if (state.grid[cellKey]) {
                state.grid[cellKey] = {
                    subject: null,
                    teacher: null,
                    status: 'EMPTY'
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
    },
});

export const {
    setSelectedClass,
    setSelectedSection,
    setActiveCell,
    setSubjectToCell,
    setTeacherToCell,
    clearCell,
    resetGrid,
} = timetableSlice.actions;

export const timetableReducer = timetableSlice.reducer;
