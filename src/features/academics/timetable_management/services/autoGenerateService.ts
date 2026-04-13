import axios from 'axios';
import type { AutoGenerateRequest, AutoGenerateResponse, BulkGenerateRequest, BulkGenerateResponse } from '../types';

const LLM_SERVER_URL = 'http://localhost:5000';

/**
 * Call the LLM server to generate an optimized timetable.
 */
export async function generateTimetable(request: AutoGenerateRequest): Promise<AutoGenerateResponse> {
    try {
        const response = await axios.post<AutoGenerateResponse>(
            `${LLM_SERVER_URL}/generate-timetable`,
            request,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 60000, // 60 second timeout for LLM processing
            }
        );
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            // LLM returned constraint error (422)
            if (error.response?.status === 422 && error.response?.data) {
                return error.response.data as AutoGenerateResponse;
            }
            // Network or server error
            return {
                success: false,
                error: 'Cannot generate timetable due to some error. Please try again later.',
            };
        }
        return {
            success: false,
            error: 'Cannot generate timetable due to some error. Please try again later.',
        };
    }
}

/**
 * Call the LLM server to generate timetables for all sections in bulk.
 */
export async function generateTimetableBulk(request: BulkGenerateRequest): Promise<BulkGenerateResponse> {
    try {
        const response = await axios.post<BulkGenerateResponse>(
            `${LLM_SERVER_URL}/generate-timetable-bulk`,
            request,
            {
                headers: { 'Content-Type': 'application/json' },
                timeout: 300000, // 5 minute timeout for bulk processing
            }
        );
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.data) {
            return error.response.data as BulkGenerateResponse;
        }
        return {
            success: false,
            totalSections: 0,
            successCount: 0,
            failedCount: 0,
            results: [],
        };
    }
}
