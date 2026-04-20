import { Skeleton } from "@/components/ui/skeleton";

export function HeaderSkeleton() {
  return (
    <div className="flex items-center gap-4 bg-card p-6 rounded-xl border border-border/50 shadow-sm col-span-1 md:col-span-2 lg:col-span-3">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

export function AcademicSkeleton() {
  return (
    <div className="bg-card p-6 rounded-xl border border-border/50 shadow-sm flex flex-col gap-4">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

export function AttendanceSkeleton() {
  return (
    <div className="bg-card p-6 rounded-xl border border-border/50 shadow-sm flex flex-col items-center justify-center gap-4 h-[240px]">
      <Skeleton className="h-32 w-32 rounded-full" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

export function FinanceSkeleton() {
  return (
    <div className="bg-card p-6 rounded-xl border border-border/50 shadow-sm flex flex-col gap-4">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-12 w-32" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div className="bg-card p-6 rounded-xl border border-border/50 shadow-sm col-span-1 md:col-span-2 lg:col-span-1 space-y-6">
      <Skeleton className="h-6 w-32" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="space-y-2 w-full">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── New Phase 2 skeletons ──────────────────────────────────────────────

export function QuickAccessBentoSkeleton() {
  return (
    <div className="bg-card p-6 rounded-xl border border-border/50 shadow-sm space-y-4">
      <Skeleton className="h-6 w-36" />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function AttendanceInsightSkeleton() {
  return (
    <div className="bg-card p-6 rounded-xl border border-border/50 shadow-sm space-y-4">
      <Skeleton className="h-6 w-44" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-8 flex-1 rounded-md" />)}
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  );
}

export function ExamCountdownSkeleton() {
  return (
    <div className="bg-card p-6 rounded-xl border border-border/50 shadow-sm space-y-4">
      <Skeleton className="h-6 w-36" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="flex justify-center gap-3">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-14 rounded-xl" />)}
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}

export function StreakBadgeSkeleton() {
  return (
    <div className="bg-card p-6 rounded-xl border border-border/50 shadow-sm space-y-4">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-2.5">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    </div>
  );
}

export function DashboardBentoSkeleton() {
  return (
    <div className="space-y-6">
      {/* Row 1 – KPI Ribbon */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2 bg-card p-6 rounded-xl border border-border/50 shadow-sm flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full shrink-0" />
          <div className="space-y-2.5 w-full">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <AttendanceSkeleton />
        <FinanceSkeleton />
      </div>

      {/* Row 2 – Quick Access Bento */}
      <QuickAccessBentoSkeleton />

      {/* Row 3 – Schedule + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8"><TimelineSkeleton /></div>
        <div className="lg:col-span-4"><ExamCountdownSkeleton /></div>
      </div>

      {/* Row 4 – Attendance + Streak */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5"><AttendanceInsightSkeleton /></div>
        <div className="lg:col-span-4"><StreakBadgeSkeleton /></div>
        <div className="lg:col-span-3"><AcademicSkeleton /></div>
      </div>
    </div>
  );
}
