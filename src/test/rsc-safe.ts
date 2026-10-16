import { isValidElement, type ReactNode } from "react";

/**
 * React Server Components cannot serialise a function that ends up as a prop ("Event handlers cannot be passed to
 * Client Component props"). `renderToStaticMarkup` silently drops function props, so an HTML assertion can never
 * see this. This walks the ELEMENT TREE instead: it calls plain function components (server-style, no hooks) down
 * to host elements and lists every function-valued prop it finds, as `<tag>.prop` paths.
 *
 * `boundaries` are component types to treat as client components: not called, only their own props are checked
 * (a client component's props cross the same serialisation boundary). A function component that throws when called
 * bare (it needs React's hooks dispatcher) is also treated as a boundary.
 */
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
      let rendered: unknown;
      try {
        rendered = (type as (p: unknown) => unknown)(props);
      } catch {
        checkProps(`<${type.name || "Component"}>`, props);
        return walk(props.children);
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
