import { IconPin } from "@/components/icons";
import { Avatar } from "@/components/ui";
import { stamp } from "./format";

/**
 * Who wrote it and when, for a post or a comment: an Avatar tile, the name, then the time. No pills: "Creator" and
 * "Pinned" are plain words, so the state is in the text and never in a coloured fill. A long name wraps.
 */
export function AuthorRow({
  name,
  isCreator,
  pinned = false,
  createdAt,
  editedAt,
}: {
  name: string;
  isCreator: boolean;
  pinned?: boolean;
  createdAt: Date;
  editedAt: Date | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} size="sm" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="min-w-0 break-words text-sm font-semibold text-ink">{name}</span>
          {isCreator && <span className="text-xs font-semibold text-ink">Creator</span>}
          {pinned && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink">
              <IconPin size={14} className="shrink-0" />
              Pinned
            </span>
          )}
        </div>
        <p className="t-meta">
          <time dateTime={createdAt.toISOString()}>{stamp(createdAt)}</time>
          {editedAt && <span><span aria-hidden="true"> · </span>edited</span>}
        </p>
      </div>
    </div>
  );
}
