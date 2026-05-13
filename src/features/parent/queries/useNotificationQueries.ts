import { useQuery } from "@tanstack/react-query";
import { parentService } from "@/services/parentService";

export const notificationKeys = {
  all: ["notifications"] as const,
};

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: async () => {
      const res = await parentService.getNotifications();
      return res.data;
    },
    refetchInterval: 30000, // Refresh every 30s
  });
}
