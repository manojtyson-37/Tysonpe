export default function PayoutsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2 border-b border-line/60 pb-5">
        <div className="h-7 w-32 rounded-lg bg-surface-2" />
        <div className="h-4 w-64 rounded-md bg-surface-2/60" />
      </div>

      {/* UPI Settlement Card Skeleton */}
      <div className="card p-4 flex items-center justify-between border-line/80 bg-surface">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-2" />
          <div className="space-y-1.5">
            <div className="h-3 w-32 rounded bg-surface-2" />
            <div className="h-4 w-44 rounded bg-surface-2/60" />
          </div>
        </div>
        <div className="h-4 w-24 rounded bg-surface-2" />
      </div>

      {/* 4 Stat Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-5 space-y-2">
            <div className="h-3 w-20 rounded bg-surface-2" />
            <div className="h-8 w-28 rounded-lg bg-surface-2" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-line/60">
          <div className="h-4 w-36 rounded bg-surface-2" />
        </div>
        <div className="divide-y divide-line/40">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="h-4 w-32 rounded bg-surface-2" />
                <div className="h-3 w-48 rounded bg-surface-2/60" />
              </div>
              <div className="h-4 w-16 rounded bg-surface-2/60" />
              <div className="h-4 w-16 rounded bg-surface-2/60" />
              <div className="h-4 w-20 rounded bg-surface-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
