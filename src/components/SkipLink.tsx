/**
 * "Skip to content": the first focusable element of a shell, invisible until focused, then painted above the sticky bar
 * (z-50) and the sheets (z-60). `target` is the id of the shell's `<main>`.
 */
export function SkipLink({ target = "main" }: { target?: string }) {
  return (
    <a
      href={`#${target}`}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[70] focus:rounded-control focus:bg-brand focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-ink"
    >
      Skip to content
    </a>
  );
}
