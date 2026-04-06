import { useQuery } from "@tanstack/react-query";
import { hrmsService } from "@/services/hrms";
import type { StaffSummaryDTO } from "@/services/types/hrms";

export function useStaffList() {
  return useQuery<StaffSummaryDTO[]>({
    queryKey: ["staff", "dropdown-list"],
    queryFn: async () => {
      const res = await hrmsService.listStaffForDropdown();
      const page = res.data;
      const list = Array.isArray(page) ? page : (page as { content?: StaffSummaryDTO[] }).content ?? [];
      return list.filter((s) => s.active);
    },
    staleTime: 5 * 60 * 1000,
  });
}
