import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

/** How much of the element must be on screen before it counts as seen. */
export const IN_VIEW_THRESHOLD = 0.4;

const noSubscription = () => () => {};
const lacksObserver = () => typeof IntersectionObserver === "undefined";

/**
 * True once the referenced element has first scrolled into view, and then for good. The observer watches until the first
 * intersection and disconnects, so a later scroll away and back does not fire anything. Without IntersectionObserver
 * (old browsers, non-DOM runtimes) it reports true from the first client render, so the thing it gates still happens.
 * The server render and hydration both report false (the server snapshot), so hydration matches.
 */
export function useInViewOnce(ref: RefObject<Element | null>, threshold: number = IN_VIEW_THRESHOLD): boolean {
  const [seen, setSeen] = useState(false);
  const unsupported = useSyncExternalStore(noSubscription, lacksObserver, () => false);

  useEffect(() => {
    if (unsupported) return;
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setSeen(true);
        observer.disconnect();
      },
      { threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, threshold, unsupported]);

  return seen || unsupported;
}
