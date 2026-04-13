export interface LectureLogRequest {
  scheduleUuid: string;
  title: string;
  description?: string;
  documentUrls?: string[];
  hasTakenTest: boolean;
}

export interface LectureLogResponse {
  uuid: string;
  scheduleUuid: string;
  title: string;
  description?: string;
  documentUrls?: string[];
  hasTakenTest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LectureLogUploadInitRequest {
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface LectureLogUploadInitResponse {
    provider: string;
    method: string;
    uploadUrl: string;
    objectKey: string;
    expiresAt: string;
    fields: Record<string, string>;
    headers: Record<string, string>;
}
