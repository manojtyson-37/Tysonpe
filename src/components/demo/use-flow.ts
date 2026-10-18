import { useCallback, useEffect, useRef, useState } from "react";
import { INITIAL_FLOW, flowReducer, settleDelay, type FlowAction } from "@/lib/demo-model";

/**
 * May a timer-driven focus move happen? Only when the visitor has not gone elsewhere: focus is on the body or nowhere
 * (the old step's controls were just removed), or somewhere inside the demo (the previous step's heading is inside it
 * too). Anything else is the visitor's own place on the page (a link, a field, the nav) and is left alone. Structural
 * types keep this testable without a DOM.
 */
export function focusIsFree(
  active: unknown,
  { root, body }: { root: { contains(node: never): boolean } | null; body: unknown },
): boolean {
  if (active === null || active === undefined || active === body) return true;
  return Boolean(root?.contains(active as never));
}

/**
 * The checkout step machine for one demo tab: state from the pure reducer, the timer that settles `processing` into
 * success or failed, and the focus hand-off. When the step changes after the visitor has acted, focus moves to the new
 * step's heading (`headingRef` goes on it, tabIndex -1), so a keyboard or screen-reader user is never left on a button
 * that has just been removed. The first render never moves focus. When the move is the settle timer's (the visitor did
 * not act), it is skipped if the visitor has moved focus elsewhere and never scrolls the page. `rootRef` goes on the
 * tab's outermost element so "inside the demo" can be answered.
 */
export function useDemoFlow() {
  const [flow, setFlow] = useState(INITIAL_FLOW);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const timerSettled = useRef(false);
  const send = useCallback((action: FlowAction) => setFlow((f) => flowReducer(f, action)), []);

  // The pending timer dies with the step: a reset, a tab switch or an unmount cancels it, so a late "success" can
  // never land on a screen the visitor has already left.
  useEffect(() => {
    const ms = settleDelay(flow);
    if (ms === null) return;
    const timer = setTimeout(() => {
      timerSettled.current = true;
      setFlow((f) => flowReducer(f, { type: "settle" }));
    }, ms);
    return () => clearTimeout(timer);
  }, [flow]);

  useEffect(() => {
    const byTimer = timerSettled.current;
    timerSettled.current = false;
    if (flow.touched) {
      if (!byTimer) {
        headingRef.current?.focus();
      } else if (focusIsFree(document.activeElement, { root: rootRef.current, body: document.body })) {
        headingRef.current?.focus({ preventScroll: true });
      }
    }
  }, [flow.step, flow.touched]);

  return { flow, send, headingRef, rootRef };
}
