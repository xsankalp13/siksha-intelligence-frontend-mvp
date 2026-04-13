import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Skeleton className="h-[360px] rounded-xl lg:col-span-5" />
        <Skeleton className="h-[360px] rounded-xl lg:col-span-7" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Skeleton className="h-[300px] rounded-xl lg:col-span-8" />
        <Skeleton className="h-[300px] rounded-xl lg:col-span-4" />
      </div>
    </div>
  );
}
