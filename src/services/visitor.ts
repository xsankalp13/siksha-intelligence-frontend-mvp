import { api } from "@/lib/axios";

export interface VisitorLog {
  id?: string;
  name: string;
  gender: string;
  aadhaarNo: string;
  phoneNo: string;
  purpose: string;
  whomToMeet: string;
  visitTime?: string;
}

export const createVisitorLog = async (logData: Partial<VisitorLog>): Promise<VisitorLog> => {
  const response = await api.post('/adm/visitors', logData);
  return response.data;
};

export const getVisitorLogs = async (period: 'daily' | 'weekly' | 'monthly' | 'all'): Promise<VisitorLog[]> => {
  const response = await api.get(`/adm/visitors?period=${period}`);
  return response.data;
};
