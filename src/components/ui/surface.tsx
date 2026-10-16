import { createElement } from "react";
import type { HTMLAttributes } from "react";

export type SurfaceTone = "default" | "inset" | "paper" | "interactive";
export type SurfacePadding = "sm" | "md" | "lg";

// default: white card on the paper canvas. inset: recessed band. paper: canvas colour inside a tinted band.
// interactive: card with the single hover recipe (border and tone shift). No resting shadow in any tone.
const TONE_CLASS: Record<SurfaceTone, string> = {
  default: "card",
  inset: "rounded-card bg-surface-2",
  paper: "rounded-card border border-line bg-bg",
  interactive: "card card-hover",
};

// Asymmetric on purpose: more horizontal than vertical room.
const PADDING_CLASS: Record<SurfacePadding, string> = {
  sm: "px-4 py-3",
  md: "px-5 py-4",
  lg: "px-6 py-5 sm:px-8 sm:py-6",
};

export type SurfaceProps = HTMLAttributes<HTMLElement> & {
  tone?: SurfaceTone;
  padding?: SurfacePadding;
  as?: "div" | "section" | "article" | "li";
};

export function Surface({ tone = "default", padding = "md", as = "div", className, ...rest }: SurfaceProps) {
  const cls = [TONE_CLASS[tone], PADDING_CLASS[padding], className].filter(Boolean).join(" ");
  return createElement(as, { className: cls, ...rest });
}
