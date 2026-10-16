"use client";

import { useState } from "react";

/**
 * The photo half of `Avatar`, split out so the letter tile stays a server component. A photo that fails to load
 * (dead host, hotlink block, expired signed URL) unmounts itself, and the parent's letter shows through underneath.
 */
export function AvatarImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote creator photos have no known size or host
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="absolute inset-0 size-full object-cover"
    />
  );
}
