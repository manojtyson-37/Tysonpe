export default function AffiliatesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-5">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded-lg bg-surface-2" />
          <div className="h-4 w-80 rounded-md bg-surface-2/60" />
        </div>
        <div className="h-9 w-36 rounded-xl bg-surface-2" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-4 space-y-2">
            <div className="h-3 w-24 rounded bg-surface-2/60" />
            <div className="h-7 w-32 rounded bg-surface-2" />
            <div className="h-3 w-28 rounded bg-surface-2/40" />
          </div>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-4 border-b border-line pb-2">
        <div className="h-5 w-28 rounded bg-surface-2" />
        <div className="h-5 w-32 rounded bg-surface-2/60" />
      </div>

      {/* Partners Table Skeleton */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-line flex justify-between items-center">
          <div className="h-4 w-40 rounded bg-surface-2" />
          <div className="h-8 w-44 rounded-lg bg-surface-2" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-line/40 last:border-0">
              <div className="space-y-1.5">
                <div className="h-4 w-36 rounded bg-surface-2" />
                <div className="h-3 w-48 rounded bg-surface-2/60" />
              </div>
              <div className="h-7 w-28 rounded bg-surface-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
