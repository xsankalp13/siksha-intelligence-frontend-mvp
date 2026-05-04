import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagingService } from '@/services/messagingService';

export const messagingKeys = {
  all: ['messaging'] as const,
  teachers: (studentId: number) => [...messagingKeys.all, 'teachers', studentId] as const,
  guardians: (studentId: number) => [...messagingKeys.all, 'guardians', studentId] as const,
  conversation: (studentId: number, otherUserId: number) => [...messagingKeys.all, 'conversation', studentId, otherUserId] as const,
};

export function useChatTeachers(studentId: number | null) {
  return useQuery({
    queryKey: studentId ? messagingKeys.teachers(studentId) : [...messagingKeys.all, 'teachers', 'none'],
    queryFn: async () => {
      if (!studentId) throw new Error("No student selected");
      const res = await messagingService.getTeachersForStudent(studentId);
      return res.data;
    },
    enabled: !!studentId,
  });
}

export function useChatGuardians(studentId: number | null) {
  return useQuery({
    queryKey: studentId ? messagingKeys.guardians(studentId) : [...messagingKeys.all, 'guardians', 'none'],
    queryFn: async () => {
      if (!studentId) throw new Error("No student selected");
      const res = await messagingService.getGuardiansForStudent(studentId);
      return res.data;
    },
    enabled: !!studentId,
  });
}

export function useConversation(studentId: number | null, otherUserId: number | null) {
  return useQuery({
    queryKey: studentId && otherUserId ? messagingKeys.conversation(studentId, otherUserId) : [...messagingKeys.all, 'conversation', 'none'],
    queryFn: async () => {
      if (!studentId || !otherUserId) throw new Error("Missing parameters");
      const res = await messagingService.getConversation(studentId, otherUserId);
      return res.data;
    },
    enabled: !!studentId && !!otherUserId,
    refetchInterval: 5000, // Poll every 5s for new messages
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, receiverUserId, content }: { studentId: number, receiverUserId: number, content: string }) => {
      const res = await messagingService.sendMessage(studentId, receiverUserId, content);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversation(variables.studentId, variables.receiverUserId) });
    }
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, otherUserId }: { studentId: number, otherUserId: number }) => {
      await messagingService.markAsRead(studentId, otherUserId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: messagingKeys.teachers(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: messagingKeys.guardians(variables.studentId) });
    }
  });
}
