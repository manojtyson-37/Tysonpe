import { Skeleton, SkeletonAvatar, SkeletonText } from "@/components/ui";

// Mirrors the channel page: heading and one-line sub, then the ruled feed (divide-y, avatar row + body per post).
// Static fills, no pulse. The layout owns the landmark, so there is no <main> here.
export default function CommunityLoading() {
  return (
    <div className="space-y-5">
      <span role="status" className="sr-only">Loading community</span>
      <div aria-hidden="true" className="space-y-5">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-64 max-w-full" />
        </div>
        <ul className="divide-y divide-line">
          {[0, 1, 2].map((i) => (
            <li key={i} className="py-5 first:pt-0">
              <div className="flex items-center gap-3">
                <SkeletonAvatar size={32} />
                <Skeleton className="h-4 w-32" />
              </div>
              <SkeletonText lines={3} className="mt-3" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
