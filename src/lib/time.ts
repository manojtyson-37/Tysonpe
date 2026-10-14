/**
 * Current time for server components. Pages here render once per request, so reading the clock is
 * correct; routing it through a helper keeps that intent explicit (and satisfies react-hooks/purity).
 */
export const nowMs = () => Date.now();
