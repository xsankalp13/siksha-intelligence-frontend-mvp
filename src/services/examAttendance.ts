import { api as axiosInstance } from '@/lib/axios';
import type {
    InvigilatorRoomResponseDTO,
    ExamRoomStudentResponseDTO,
    ExamAttendanceMarkRequestDTO,
    ExamAttendanceFinalizeRequestDTO
} from './types/examAttendance';

const PREFIX = '/auth/examination/exam-attendance';
const ROOMS_PREFIX = '/auth/examination/invigilator/rooms';

export const examAttendanceService = {
    /**
     * Get all rooms assigned to the current invigilator
     */
    getInvigilatorRooms: async (): Promise<InvigilatorRoomResponseDTO[]> => {
        const response = await axiosInstance.get(ROOMS_PREFIX);
        return response.data;
    },

    /**
     * Get the student roster and attendance status for a specific room and exam schedule
     */
    getRoomRoster: async (roomId: number, examScheduleId: number): Promise<ExamRoomStudentResponseDTO[]> => {
        const response = await axiosInstance.get(`${PREFIX}/room/${roomId}`, {
            params: { examScheduleId }
        });
        return response.data;
    },

    /**
     * Mark attendance for a batch of students
     */
    markAttendance: async (request: ExamAttendanceMarkRequestDTO): Promise<any> => {
        const response = await axiosInstance.post(`${PREFIX}/mark`, request);
        return response.data;
    },

    /**
     * Finalize attendance for a room (locks the room and marks remaining unmarked as ABSENT)
     */
    finalizeAttendance: async (request: ExamAttendanceFinalizeRequestDTO): Promise<any> => {
        const response = await axiosInstance.post(`${PREFIX}/finalize`, request);
        return response.data;
    }
};
