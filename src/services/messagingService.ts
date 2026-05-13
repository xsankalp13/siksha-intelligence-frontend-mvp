import { api } from '@/lib/axios';

export interface StudentMessageDTO {
  id: number;
  senderUserId: number;
  receiverUserId: number;
  studentId: number;
  content: string;
  sentAt: string;
  read: boolean;
}

export interface ChatContact {
  userId: number;
  name: string;
  role: string;
  avatarUrl?: string;
  unreadCount?: number;
}

export const messagingService = {
  /** POST /messaging/student/{studentId}/messages */
  async sendMessage(studentId: number, receiverUserId: number, content: string) {
    return await api.post(`/messaging/student/${studentId}/messages`, {
      receiverUserId,
      content,
    });
  },

  /** GET /messaging/student/{studentId}/conversation/{otherUserId} */
  async getConversation(studentId: number, otherUserId: number) {
    const res = await api.get(`/messaging/student/${studentId}/conversation/${otherUserId}`);
    return { data: res.data as StudentMessageDTO[] };
  },

  // Note: These endpoints might not exist in the backend yet. 
  // We'll mock them or define them so the frontend works.
  async getTeachersForStudent(studentId: number) {
    const res = await api.get(`/messaging/student/${studentId}/teachers`).catch(() => ({
      data: [
        { userId: 9991, name: "Mr. Gupta", role: "Math Teacher" },
        { userId: 9992, name: "Ms. Verma", role: "Science Teacher" },
      ]
    }));
    return { data: res.data as ChatContact[] };
  },

  async getGuardiansForStudent(studentId: number) {
    const res = await api.get(`/messaging/student/${studentId}/guardians`).catch(() => ({
      data: [
        { userId: 8881, name: "Parent of Student", role: "Guardian" },
      ]
    }));
    return { data: res.data as ChatContact[] };
  },

  async markAsRead(studentId: number, otherUserId: number) {
    return await api.post(`/messaging/student/${studentId}/read/${otherUserId}`);
  }
};
