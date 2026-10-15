import { toggleLikeAction } from "@/app/actions/community";

export function LikeButton({ kind, id, count, liked }: { kind: "post" | "comment"; id: string; count: number; liked: boolean }) {
  return (
    <form action={toggleLikeAction.bind(null, kind, id)}>
      <button
        type="submit"
        aria-pressed={liked}
        aria-label={liked ? `Remove like (${count})` : `Like (${count})`}
        className={`btn btn-sm transition-all duration-150 active:scale-[0.98] ${liked ? "btn-primary" : "btn-secondary"}`}
      >
        <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6">
          <path d="M10 16.5s-6-3.6-6-8.1A3.4 3.4 0 0 1 10 6.3a3.4 3.4 0 0 1 6 2.1c0 4.5-6 8.1-6 8.1Z" strokeLinejoin="round" />
        </svg>
        <span className="tabular-nums">{count}</span>
      </button>
    </form>
  );
}
