export default function IntegrationsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-5">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-surface-2" />
          <div className="h-4 w-72 rounded-md bg-surface-2/60" />
        </div>
        <div className="h-9 w-36 rounded-xl bg-surface-2" />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-4 border-b border-line pb-2">
        <div className="h-5 w-32 rounded bg-surface-2" />
        <div className="h-5 w-36 rounded bg-surface-2/60" />
        <div className="h-5 w-32 rounded bg-surface-2/60" />
        <div className="h-5 w-28 rounded bg-surface-2/60" />
      </div>

      {/* Banner Skeleton */}
      <div className="card p-5 h-20 space-y-2">
        <div className="h-4 w-52 rounded bg-surface-2" />
        <div className="h-3 w-80 rounded bg-surface-2/60" />
      </div>

      {/* List Skeletons */}
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-60 rounded bg-surface-2" />
              <div className="flex gap-2">
                <div className="h-7 w-20 rounded bg-surface-2" />
                <div className="h-7 w-16 rounded bg-surface-2" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-4 w-20 rounded-full bg-surface-2/60" />
              <div className="h-4 w-24 rounded-full bg-surface-2/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
