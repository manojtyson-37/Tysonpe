import * as React from "react";
import * as ReactDOM from "react-dom";
import { isValidElement, type ReactNode } from "react";

/**
 * React Server Components cannot serialise a function that ends up as a prop ("Event handlers cannot be passed to
 * Client Component props"). `renderToStaticMarkup` silently drops function props, so an HTML assertion can never
 * see this. `functionProps` walks the ELEMENT TREE instead: it calls plain function components (server-style, no
 * hooks) down to host elements and lists every function-valued prop it finds, as `<tag>.prop` paths.
 *
 * Components are called under a stand-in for React's SERVER dispatcher, which supports only `useId`, `useMemo`,
 * `useCallback` and `useDebugValue` (what `react-server` exports; `chart.tsx` uses `useId` and is genuinely server-safe).
 * Every other hook, `use` included, fails the way a bare call does, and so lands in the case below.
 *
 * `boundaries` are component types to treat as client components: not called, only their own props are checked
 * (a client component's props cross the same serialisation boundary). Two kinds of component are treated as
 * boundaries WITHOUT being listed, because calling them bare cannot work, and each is reported through
 * `onImplicitBoundary` so a test can refuse them:
 *  - "hook": calling it threw the error React throws when a hook runs with no dispatcher, so it needs a client.
 *  - "class": a class component cannot be a server component.
 * A server-rendered primitive that reaches either has silently become client-only without a "use client" file, which
 * is a production 500 that every SSR test passes. Any OTHER error is rethrown, because reclassifying a component that
 * genuinely throws would leave its whole subtree unchecked (a false "clean"). An async component is rejected outright:
 * its result is a Promise the walk cannot see into, so await it first: `functionProps(await Page(props))`.
 * A function passed as `children` is reported like any other function prop (a render prop crosses the same boundary).
 *
 * What this DOES cover: literal JSX function props anywhere on the walked tree (and, with the static scan in
 * `rsc-safe.test.tsx`, literal `on*={...}` handlers in non-client modules), swallowed errors, async components, and
 * hooks or classes in a component that is not listed.
 *
 * What it does NOT cover: function props reached through spreads that the walk cannot see, functions nested inside
 * object or array props, `memo`/`forwardRef` wrappers (treated as client-like, props checked, never called), element
 * valued props on boundaries, and non-function values the RSC serializer rejects such as a Prisma `Decimal`, a
 * class instance or a symbol. A clean result means "no function props found on the paths walked", never "RSC-safe"
 * in general.
 */
export interface WalkOptions {
  /** Called for a component that was not listed as a boundary but could not be called as a server component. */
  onImplicitBoundary?: (name: string, reason: "hook" | "class") => void;
  /** Called with the type of every non-host element the walk meets (called components and boundaries alike). */
  onVisit?: (type: unknown) => void;
}

// A hook that runs with no dispatcher throws "Cannot read properties of null (reading '<method>')", where the method is
// a dispatcher method. They are exactly React's own hook exports (plus react-dom's `useFormStatus` -> `useHostTransitionStatus`),
// so the set is read from the packages instead of guessed from a `use*` prefix: `user`, `username` and `useCase` are
// ordinary properties and must stay real null-dereference failures.
const HOOK_METHODS = new Set<string>(
  [...Object.keys(React), ...Object.keys(ReactDOM)].filter((key) => key === "use" || /^use[A-Z]/.test(key)).concat("useHostTransitionStatus"),
);

/**
 * True only for the error React throws when a hook runs with no dispatcher, i.e. a component called outside a render:
 * the explicit "Invalid hook call" message (React 19 only logs it, so this is near-dead), or the null-dispatcher
 * TypeError naming a real hook method. Anything else is a real bug in the component.
 */
function isHookDispatcherError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (/^Invalid hook call\b/.test(error.message)) return true;
  const named = error instanceof TypeError ? /^Cannot read properties of null \(reading '([^']+)'\)$/.exec(error.message) : null;
  return named !== null && HOOK_METHODS.has(named[1]);
}

const isClassComponent = (type: unknown): boolean =>
  typeof type === "function" && Boolean((type as { prototype?: { isReactComponent?: unknown } }).prototype?.isReactComponent);

const noop = () => {};

const INTERNALS = (React as unknown as Record<string, { H: unknown } | undefined>).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

/**
 * The hooks a server component may call, answered inline; anything else throws the same null-dispatcher TypeError a bare
 * call would, so `isHookDispatcherError` classifies it as a client-only component instead of treating it as a bug.
 */
function serverDispatcher(): object {
  let nextId = 0;
  const supported: Record<string, unknown> = {
    useId: () => `:rsc${nextId++}:`,
    useMemo: (factory: () => unknown) => factory(),
    useCallback: (callback: unknown) => callback,
    useDebugValue: noop,
  };
  return new Proxy(supported, {
    get: (target, name) =>
      typeof name === "string" && name in target
        ? target[name]
        : () => {
            throw new TypeError(`Cannot read properties of null (reading '${String(name)}')`);
          },
  });
}

/** Calls a component with the server dispatcher installed, then puts back whatever was there. */
function callAsServerComponent(type: (props: unknown) => unknown, props: unknown): unknown {
  if (!INTERNALS) return type(props);
  const previous = INTERNALS.H;
  INTERNALS.H = serverDispatcher();
  try {
    return type(props);
  } finally {
    INTERNALS.H = previous;
  }
}

export function functionProps(node: ReactNode, boundaries: unknown[] = [], options: WalkOptions = {}): string[] {
  const found: string[] = [];

  const checkProps = (label: string, props: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(props)) {
      if (typeof value === "function") found.push(`${label}.${key}`);
      else if (key === "children" && Array.isArray(value) && value.some((child) => typeof child === "function")) found.push(`${label}.${key}`);
    }
  };

  const walk = (n: unknown): void => {
    if (n == null || typeof n === "boolean" || typeof n === "string" || typeof n === "number") return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (!isValidElement(n)) return;
    const { type } = n;
    const props = (n.props ?? {}) as Record<string, unknown>;
    if (typeof type === "string") {
      checkProps(`<${type}>`, props);
      return walk(props.children);
    }
    options.onVisit?.(type);
    const boundary = (name: string) => {
      checkProps(`<${name}>`, props);
      walk(props.children);
    };
    if (typeof type === "function" && !boundaries.includes(type)) {
      const name = type.name || "Component";
      if (isClassComponent(type)) {
        options.onImplicitBoundary?.(name, "class");
        return boundary(name);
      }
      let rendered: unknown;
      try {
        rendered = callAsServerComponent(type as (p: unknown) => unknown, props);
      } catch (error) {
        if (!isHookDispatcherError(error)) {
          throw new Error(`<${name}> threw while being walked: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
        }
        options.onImplicitBoundary?.(name, "hook");
        return boundary(name);
      }
      if (typeof (rendered as { then?: unknown } | null)?.then === "function") {
        // Settle a real Promise so a rejection is not reported as unhandled on top of the error below. A foreign
        // thenable is never called: its `then` may not follow the Promise contract, and that must not hide this message.
        if (rendered instanceof Promise) rendered.then(undefined, noop);
        throw new Error(`<${name}> is an async component: the walk cannot see into a Promise. Await it first: functionProps(await ${name}(props))`);
      }
      return walk(rendered);
    }
    // Fragment / Suspense (symbols) pass children straight through; forwardRef / memo / listed boundaries are client-like.
    if (typeof type !== "symbol") {
      const name = typeof type === "function" ? type.name : ((type as { displayName?: string })?.displayName ?? "Client");
      checkProps(`<${name || "Client"}>`, props);
    }
    walk(props.children);
  };

  walk(node);
  return found;
}
