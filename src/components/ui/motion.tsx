"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { LazyMotion, type FeatureBundle } from "framer-motion";

/**
 * The one shared loader for framer-motion's animation features (`domMax`: animations, exit, layout, gestures).
 * They live in their own module so the bundler can split them into a separate chunk, fetched the first time an
 * overlay opens or a Toaster/Tabs mounts rather than with the page. Never import `./motion-features` statically.
 */
export const loadFeatures = () => import("./motion-features").then((m) => m.default);

const NO_FEATURES = {} as FeatureBundle;

/**
 * Provides the shared features to `m` components below it. `enabled={false}` skips the chunk entirely (reduced motion).
 * If the chunk fails to load, `onLoadError` runs once and the tree keeps working with no features, so callers can
 * stop passing `initial`/`exit` props (those would leave content at its initial, invisible state).
 */
export function OverlayMotion({ children, enabled = true, onLoadError }: { children: ReactNode; enabled?: boolean; onLoadError?: () => void }) {
  const errorRef = useRef(onLoadError);
  useEffect(() => {
    errorRef.current = onLoadError;
  });
  // A stable async loader (LazyMotion reads it once, on mount) that reports a rejected import instead of leaving it unhandled.
  const [load] = useState(() => () =>
    loadFeatures().catch(() => {
      if (process.env.NODE_ENV !== "production") console.warn("Motion features failed to load; rendering without animation.");
      errorRef.current?.();
      return NO_FEATURES;
    }),
  );
  return <LazyMotion features={enabled ? load : NO_FEATURES}>{children}</LazyMotion>;
}
