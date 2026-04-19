export default function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI Ribbon */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-6 w-16 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="h-[400px] animate-pulse rounded-2xl border bg-card shadow-sm" />
        </div>
        <div className="lg:col-span-4 space-y-6">
          <div className="h-[180px] animate-pulse rounded-2xl border bg-card shadow-sm" />
          <div className="h-[196px] animate-pulse rounded-2xl border bg-card shadow-sm" />
        </div>
      </div>
    </div>
  );
}
