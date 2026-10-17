export default function CommunityLoading() {
  return (
    <div role="status" aria-label="Loading community" className="space-y-4">
      <div className="h-7 w-40 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="card h-28 animate-pulse bg-surface-2/60 motion-reduce:animate-none" />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
