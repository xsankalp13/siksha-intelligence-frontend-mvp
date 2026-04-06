import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Users, Wallet } from "lucide-react";
import { useSpring } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import StatCard from "@/components/common/StatCard";
import { hrmsService } from "@/services/hrms";
import type { TeacherDashboardSummaryResponseDto } from "@/services/types/teacher";

type Props = {
  summary?: TeacherDashboardSummaryResponseDto;
};

function useAnimatedNumber(value: number) {
  const spring = useSpring(0, { stiffness: 140, damping: 24 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    spring.set(value);
    const unsub = spring.on("change", (latest) => setDisplay(Math.round(latest)));
    return () => unsub();
  }, [spring, value]);

  return display;
}

export default function KpiRibbon({ summary }: Props) {
  const totalStudents = useAnimatedNumber(summary?.totalStudents ?? 0);
  const present = useAnimatedNumber(summary?.attendance.present ?? 0);
  const classes = useAnimatedNumber(summary?.classesToday ?? 0);

  const { data: leaveBalance } = useQuery({
    queryKey: ["teacher", "leave-balance"],
    queryFn: async () => {
      try {
        return (await hrmsService.getMyLeaveBalance()).data;
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const totalLeaveRemaining = (leaveBalance ?? []).reduce((sum, b) => sum + (b.remaining ?? 0), 0);
  const leaveLoaded = leaveBalance !== undefined;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Total Students" value={totalStudents} subtitle="Across your classes" icon={Users} iconClassName="bg-blue-500/20 text-blue-700" />
      <StatCard
        title="Present Today"
        value={present}
        subtitle={`${summary?.attendance.percentage?.toFixed(1) ?? "0.0"}% attendance`}
        icon={CheckCircle2}
        iconClassName="bg-emerald-500/20 text-emerald-700"
      />
      <StatCard title="Classes Today" value={classes} subtitle="Scheduled teaching slots" icon={BookOpen} iconClassName="bg-indigo-500/20 text-indigo-700" />
      <StatCard
        title="Leave Balance"
        value={leaveLoaded ? totalLeaveRemaining : "--"}
        subtitle={leaveLoaded ? `${(leaveBalance ?? []).length} leave type${(leaveBalance ?? []).length !== 1 ? "s" : ""}` : "Loading..."}
        icon={Wallet}
        iconClassName="bg-amber-500/20 text-amber-700"
      />
    </div>
  );
}
