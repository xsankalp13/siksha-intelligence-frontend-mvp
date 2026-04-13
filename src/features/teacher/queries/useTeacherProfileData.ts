import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { profileService } from "@/services/profile";
import { hrmsService } from "@/services/hrms";
import {
  useTeacherClasses,
  useTeacherSchedule,
} from "@/features/teacher/queries/useTeacherQueries";
import type { ComprehensiveUserProfileResponseDTO } from "@/services/types/profile";
import { useAppSelector } from "@/store/hooks";

export function useTeacherProfileData() {
  const authUserId = useAppSelector((state) => state.auth.user?.userId);

  const profileQ = useQuery<ComprehensiveUserProfileResponseDTO | null>({
    queryKey: ["profile", "me", authUserId ?? "anonymous"],
    queryFn: async () => {
      try {
        return (await profileService.getMyProfile()).data;
      } catch (error) {
        // Some roles can be blocked on /profile/me but allowed on admin profile read.
        if (axios.isAxiosError(error) && error.response?.status === 403 && authUserId) {
          const userId = Number.parseInt(String(authUserId), 10);
          if (!Number.isNaN(userId)) {
            return (await profileService.getProfileByUserId(userId)).data;
          }
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const classesQ = useTeacherClasses();
  const scheduleQ = useTeacherSchedule();

  const leaveQ = useQuery({
    queryKey: ["hrms", "self", "leave-balance-profile"],
    queryFn: async () => {
      try {
        return (await hrmsService.getMyLeaveBalance()).data;
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const attendanceQ = useQuery({
    queryKey: ["hrms", "self", "attendance-summary-profile"],
    queryFn: async () => {
      try {
        return (await hrmsService.getMyAttendanceSummary({
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
        })).data;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    profile: profileQ.data ?? null,
    classes: classesQ.data ?? [],
    schedule: scheduleQ.data ?? null,
    leaveBalance: leaveQ.data ?? [],
    attendance: attendanceQ.data ?? null,
    isLoading: profileQ.isLoading,
    isError: profileQ.isError,
  };
}
