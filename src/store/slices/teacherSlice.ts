import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { attendanceService } from "@/services/attendance";
import type { StudentAttendanceRequestDTO } from "@/services/types/attendance";
import { getAttendanceErrorMessage } from "@/features/attendance/utils/attendanceError";

export interface AttendanceEntry {
  studentId: string;
  status: "PRESENT" | "ABSENT" | "LATE" | null;
}

export interface TeacherState {
  attendanceSession: {
    entries: AttendanceEntry[];
    currentIndex: number;
    submitted: boolean;
    isFirstLecture: boolean;
    classId: string | null;
  };
  loading: boolean;
  error: string | null;
}

const initialState: TeacherState = {
  attendanceSession: {
    entries: [],
    currentIndex: 0,
    submitted: false,
    isFirstLecture: true,
    classId: null,
  },
  loading: false,
  error: null,
};

export const submitAttendance = createAsyncThunk(
  "teacher/submitAttendance",
  async (records: StudentAttendanceRequestDTO[], { rejectWithValue }) => {
    try {
      const response = await attendanceService.createStudentAttendanceBatch(records);
      return response.data;
    } catch (error: unknown) {
      return rejectWithValue(getAttendanceErrorMessage(error, "Failed to submit attendance"));
    }
  }
);

export const teacherSlice = createSlice({
  name: "teacher",
  initialState,
  reducers: {
    initAttendanceSession(state, action: PayloadAction<{ studentIds: string[]; classId: string }>) {
      state.attendanceSession = {
        entries: action.payload.studentIds.map((id) => ({ studentId: id, status: null })),
        currentIndex: 0,
        submitted: false,
        isFirstLecture: true,
        classId: action.payload.classId,
      };
    },

    markAttendance(
      state,
      action: PayloadAction<{ studentId: string; status: "PRESENT" | "ABSENT" | "LATE" }>
    ) {
      const entry = state.attendanceSession.entries.find((e) => e.studentId === action.payload.studentId);
      if (entry) {
        entry.status = action.payload.status;
      }
      const nextIndex = state.attendanceSession.entries.findIndex((e) => e.status === null);
      state.attendanceSession.currentIndex =
        nextIndex === -1 ? state.attendanceSession.entries.length : nextIndex;
    },

    submitAttendanceSession(state) {
      state.attendanceSession.submitted = true;
    },

    resetAttendanceSession(state) {
      state.attendanceSession = initialState.attendanceSession;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitAttendance.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(submitAttendance.fulfilled, (state) => {
        state.loading = false;
        state.attendanceSession.submitted = true;
      })
      .addCase(submitAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  initAttendanceSession,
  markAttendance,
  submitAttendanceSession,
  resetAttendanceSession,
} = teacherSlice.actions;

export const teacherReducer = teacherSlice.reducer;
