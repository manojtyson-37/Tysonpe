import { useCallback, useEffect, useRef, useState } from "react";
import { INITIAL_FLOW, flowReducer, settleDelay, type FlowAction } from "@/lib/demo-model";

/**
 * The checkout step machine for one demo tab: state from the pure reducer, the timer that settles `processing` into
 * success or failed, and the focus hand-off. When the step changes after the visitor has acted, focus moves to the new
 * step's heading (`headingRef` goes on it, tabIndex -1), so a keyboard or screen-reader user is never left on a button
 * that has just been removed. The first render never moves focus.
 */
export function useDemoFlow() {
  const [flow, setFlow] = useState(INITIAL_FLOW);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const send = useCallback((action: FlowAction) => setFlow((f) => flowReducer(f, action)), []);

  // The pending timer dies with the step: a reset, a tab switch or an unmount cancels it, so a late "success" can
  // never land on a screen the visitor has already left.
  useEffect(() => {
    const ms = settleDelay(flow);
    if (ms === null) return;
    const timer = setTimeout(() => setFlow((f) => flowReducer(f, { type: "settle" })), ms);
    return () => clearTimeout(timer);
  }, [flow]);

  useEffect(() => {
    if (flow.touched) headingRef.current?.focus();
  }, [flow.step, flow.touched]);

  return { flow, send, headingRef };
}
