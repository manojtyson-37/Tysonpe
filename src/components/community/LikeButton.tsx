import { toggleLikeAction } from "@/app/actions/community";
import { LikeSubmit } from "./LikeSubmit";

export function LikeButton({ kind, id, count, liked }: { kind: "post" | "comment"; id: string; count: number; liked: boolean }) {
  return (
    <form action={toggleLikeAction.bind(null, kind, id)}>
      <LikeSubmit count={count} liked={liked} />
    </form>
  );
}
