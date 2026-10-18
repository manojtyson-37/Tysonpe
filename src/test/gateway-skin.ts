import { isValidElement, type ReactNode } from "react";
import { legacyStyleFindings } from "./style-scan";

/**
 * What the two gateway replicas (RazorpayDemoModal, EasebuzzHostedPage) may not contain in their source: a palette-scale
 * Tailwind colour class, a hex or rgb colour, a pixel text size (`text-[11px]`), a text glyph standing in for an icon, or any
 * of the legacy styling `legacyStyleFindings` knows. Their look lives in `[data-skin]` variables in globals.css.
 */
export const PALETTE_CLASS =
  /\b(bg|text|border|ring|from|via|to|divide|fill|stroke|shadow|outline|placeholder|accent|caret|decoration)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(-[0-9]+)?(\/[0-9]+)?\b|#[0-9a-fA-F]{3,8}\b|rgba?\(/;

export function skinSourceFindings(source: string): string[] {
  const findings = [...legacyStyleFindings(source)];
  source.split("\n").forEach((line, i) => {
    const at = `line ${i + 1}`;
    if (PALETTE_CLASS.test(line)) findings.push(`${at}: palette colour: ${line.trim()}`);
    if (/text-\[\d+px\]/.test(line)) findings.push(`${at}: pixel text size: ${line.trim()}`);
    if (/[✓✕✗←→×•⤺]/.test(line)) findings.push(`${at}: text glyph: ${line.trim()}`);
    if (/\bshadow-(?!float\b)/.test(line)) findings.push(`${at}: shadow other than shadow-float: ${line.trim()}`);
    if (/\banimate-(pulse|ping|spin|bounce)\b/.test(line)) findings.push(`${at}: looping animation: ${line.trim()}`);
  });
  return findings;
}

type P = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Every element in a JSX tree (not rendered: function components are not called), depth first. */
export function allElements(node: ReactNode, out: { type: unknown; props: P }[] = []) {
  if (Array.isArray(node)) {
    node.forEach((c) => allElements(c, out));
    return out;
  }
  if (!isValidElement(node)) return out;
  const el = node as unknown as { type: unknown; props: P };
  out.push(el);
  allElements(el.props.children, out);
  return out;
}

/** The text a JSX tree would show, tags dropped (numbers and strings only). */
export function textOf(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (!isValidElement(node)) return "";
  return textOf((node.props as P).children);
}
