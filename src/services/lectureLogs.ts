import { api } from '@/lib/axios';
import type { 
  LectureLogRequest, 
  LectureLogResponse, 
  LectureLogUploadInitRequest, 
  LectureLogUploadInitResponse 
} from './types/lectureLogs';
const LECTURE_LOGS_BASE_URL = '/teacher/lecture-logs';

export const lectureLogService = {
  getLectureLog: async (scheduleUuid: string): Promise<LectureLogResponse | null> => {
    try {
      const response = await api.get<LectureLogResponse>(`${LECTURE_LOGS_BASE_URL}/schedule/${scheduleUuid}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // Return null if not found
      }
      throw error;
    }
  },

  saveLectureLog: async (data: LectureLogRequest): Promise<LectureLogResponse> => {
    const response = await api.post<LectureLogResponse>(LECTURE_LOGS_BASE_URL, data);
    return response.data;
  },

  initDocumentUpload: async (data: LectureLogUploadInitRequest): Promise<LectureLogUploadInitResponse> => {
    const response = await api.post<LectureLogUploadInitResponse>(`${LECTURE_LOGS_BASE_URL}/upload-init`, data);
    return response.data;
  },

  uploadDocumentDirectly: async (file: File, initData: LectureLogUploadInitResponse): Promise<string> => {
    if (initData.provider === 'cloudinary') {
      const formData = new FormData();
      Object.entries(initData.fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append('file', file);

      const response = await fetch(initData.uploadUrl, {
        method: initData.method,
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload document to CDN');
      }

      const result = await response.json();
      return result.secure_url;
    }
    
    throw new Error(`Unsupported upload provider: ${initData.provider}`);
  }
};
