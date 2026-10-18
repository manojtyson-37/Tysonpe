export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-5">
        <div className="space-y-2">
          <div className="h-7 w-36 rounded-lg bg-surface-2" />
          <div className="h-4 w-64 rounded-md bg-surface-2/60" />
        </div>
        <div className="flex gap-2.5">
          <div className="h-8 w-28 rounded-xl bg-surface-2" />
          <div className="h-8 w-28 rounded-xl bg-surface-2" />
        </div>
      </div>

      {/* 4 KPI Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-surface-2" />
              <div className="h-8 w-8 rounded-lg bg-surface-2" />
            </div>
            <div className="h-8 w-32 rounded-lg bg-surface-2" />
            <div className="flex justify-between pt-1">
              <div className="h-3 w-16 rounded bg-surface-2/60" />
              <div className="h-4 w-12 rounded bg-surface-2/60" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-line/60 pb-4">
          <div className="space-y-1.5">
            <div className="h-4 w-40 rounded bg-surface-2" />
            <div className="h-3 w-24 rounded bg-surface-2/60" />
          </div>
          <div className="h-7 w-32 rounded-lg bg-surface-2" />
        </div>
        <div className="h-56 w-full rounded-xl bg-surface-2/40" />
      </div>

      {/* Two Column Grid Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6 h-64 space-y-3">
          <div className="h-4 w-32 rounded bg-surface-2" />
          <div className="h-10 w-full rounded-xl bg-surface-2/40" />
          <div className="h-10 w-full rounded-xl bg-surface-2/40" />
          <div className="h-10 w-full rounded-xl bg-surface-2/40" />
        </div>
        <div className="card p-6 h-64 space-y-3">
          <div className="h-4 w-32 rounded bg-surface-2" />
          <div className="h-10 w-full rounded-xl bg-surface-2/40" />
          <div className="h-10 w-full rounded-xl bg-surface-2/40" />
          <div className="h-10 w-full rounded-xl bg-surface-2/40" />
        </div>
      </div>
    </div>
  );
}
