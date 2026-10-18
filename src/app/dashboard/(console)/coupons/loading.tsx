export default function CouponsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2 border-b border-line/60 pb-5">
        <div className="h-7 w-32 rounded-lg bg-surface-2" />
        <div className="h-4 w-60 rounded-md bg-surface-2/60" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        {/* Coupons List Skeleton */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-7 w-20 rounded-md bg-surface-2" />
                <div className="h-4 w-24 rounded bg-surface-2/60" />
                <div className="h-3 w-32 rounded bg-surface-2/40" />
              </div>
              <div className="h-6 w-16 rounded-full bg-surface-2" />
            </div>
          ))}
        </div>

        {/* New Coupon Card Skeleton */}
        <div className="card h-fit p-5 space-y-4">
          <div className="h-5 w-28 rounded bg-surface-2" />
          <div className="space-y-3">
            <div className="h-10 w-full rounded-xl bg-surface-2/60" />
            <div className="h-10 w-full rounded-xl bg-surface-2/60" />
            <div className="h-10 w-full rounded-xl bg-surface-2/60" />
            <div className="h-10 w-full rounded-xl bg-surface-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
