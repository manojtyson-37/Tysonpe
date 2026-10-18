export default function StorefrontLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-5">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-surface-2" />
          <div className="h-4 w-72 rounded-md bg-surface-2/60" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-xl bg-surface-2" />
          <div className="h-9 w-32 rounded-xl bg-surface-2" />
        </div>
      </div>

      {/* Editor & Preview Split Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left: Editor Controls */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex gap-2 border-b border-line pb-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-24 rounded-lg bg-surface-2" />
            ))}
          </div>
          <div className="card p-5 space-y-4">
            <div className="h-4 w-32 rounded bg-surface-2" />
            <div className="h-10 w-full rounded-xl bg-surface-2/60" />
            <div className="h-10 w-full rounded-xl bg-surface-2/60" />
            <div className="h-20 w-full rounded-xl bg-surface-2/40" />
          </div>
          <div className="card p-5 space-y-3">
            <div className="h-4 w-36 rounded bg-surface-2" />
            <div className="h-10 w-full rounded-xl bg-surface-2/60" />
            <div className="h-10 w-full rounded-xl bg-surface-2/60" />
          </div>
        </div>

        {/* Right: Mobile Phone Frame Preview */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-[320px] rounded-[36px] border-4 border-line/80 bg-surface p-4 shadow-xl space-y-4">
            <div className="mx-auto h-4 w-28 rounded-full bg-surface-2" />
            <div className="mx-auto h-16 w-16 rounded-full bg-surface-2/80" />
            <div className="mx-auto h-4 w-36 rounded bg-surface-2" />
            <div className="mx-auto h-3 w-48 rounded bg-surface-2/60" />
            <div className="space-y-2 pt-4">
              <div className="h-14 w-full rounded-xl bg-surface-2/40" />
              <div className="h-14 w-full rounded-xl bg-surface-2/40" />
              <div className="h-14 w-full rounded-xl bg-surface-2/40" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
