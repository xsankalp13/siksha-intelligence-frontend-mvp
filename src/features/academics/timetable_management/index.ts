// Timetable Management Feature - Barrel Exports

// Components
export { SelectionPage } from './components/SelectionPage';
export { TimetableEditor } from './components/TimetableEditor';
export { SidebarSubjects } from './components/SidebarSubjects';
export { SidebarTeachers } from './components/SidebarTeachers';
export { TimetableGrid } from './components/TimetableGrid';
export { GridCell } from './components/GridCell';
export { DraggableSubject } from './components/DraggableSubject';
export { DraggableTeacher } from './components/DraggableTeacher';
export { AutoGenerateModal } from './components/AutoGenerateModal';

// Services
export { generateTimetable } from './services/autoGenerateService';

// Store
export {
    timetableReducer,
    setSelectedClass,
    setSelectedSection,
    setActiveCell,
    setSubjectToCell,
    setTeacherToCell,
    clearCell,
    resetGrid,
} from './store/timetableSlice';

// Types
export type {
    Subject,
    Teacher,
    ClassData,
    Section,
    CellStatus,
    GridCellData,
    GridState,
    TimetableState,
    DraggableType,
    DragData,
    Day,
    TimeSlot,
    LLMTeacher,
    TimetablePeriod,
    GeneratedTimetable,
    AutoGenerateRequest,
    AutoGenerateSuccessResponse,
    AutoGenerateErrorResponse,
    AutoGenerateResponse,
} from './types';

export { DAYS, TIME_SLOTS } from './types';

// Data
export {
    initialSubjects,
    initialTeachers,
    classes,
    sections
} from './data/mockData';
