import { isValidElement, type ReactNode } from "react";

/**
 * React Server Components cannot serialise a function that ends up as a prop ("Event handlers cannot be passed to
 * Client Component props"). `renderToStaticMarkup` silently drops function props, so an HTML assertion can never
 * see this. This walks the ELEMENT TREE instead: it calls plain function components (server-style, no hooks) down
 * to host elements and lists every function-valued prop it finds, as `<tag>.prop` paths.
 *
 * `boundaries` are component types to treat as client components: not called, only their own props are checked
 * (a client component's props cross the same serialisation boundary). A function component that throws the
 * hook-dispatcher error when called bare is also treated as a boundary; any OTHER error is rethrown, because
 * reclassifying a component that genuinely throws would leave its whole subtree unchecked (a false "clean").
 * An async component is rejected outright: its result is a Promise the walk cannot see into.
 *
 * Scope: this finds FUNCTION-valued props only. It does not look at functions nested inside object or array props,
 * element-valued props on boundaries, or `memo`/`forwardRef` wrappers, and it does not catch the other values the RSC
 * serializer rejects (class instances such as a Prisma `Decimal`, symbols, ...). A clean result means "no function
 * props found on the paths walked", not "RSC-safe" in general.
 */
/**
 * True only for the error React throws when a hook runs with no dispatcher, i.e. a component called outside a render:
 * the explicit "Invalid hook call" message, or the null-dispatcher TypeError naming a `use*` property
 * ("Cannot read properties of null (reading 'useState')"). Any other failure is a real bug in the component.
 */
function isHookDispatcherError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (/Invalid hook call|dispatcher/.test(error.message)) return true;
  return error instanceof TypeError && /Cannot read properties of null \(reading 'use[A-Za-z]*'\)/.test(error.message);
}

export function functionProps(node: ReactNode, boundaries: unknown[] = []): string[] {
  const found: string[] = [];

  const checkProps = (label: string, props: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(props)) {
      if (key !== "children" && typeof value === "function") found.push(`${label}.${key}`);
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
    if (typeof type === "function" && !boundaries.includes(type)) {
      const name = type.name || "Component";
      let rendered: unknown;
      try {
        rendered = (type as (p: unknown) => unknown)(props);
      } catch (error) {
        if (!isHookDispatcherError(error)) {
          throw new Error(`<${name}> threw while being walked: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
        }
        checkProps(`<${name}>`, props);
        return walk(props.children);
      }
      if (typeof (rendered as { then?: unknown } | null)?.then === "function") {
        // Settle it so a rejection is not reported as unhandled on top of the error below.
        (rendered as Promise<unknown>).then(undefined, () => {});
        throw new Error(`<${name}> is an async component: await it before walking (the walk cannot see into a Promise)`);
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
