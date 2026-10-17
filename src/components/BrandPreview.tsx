import type { ReactNode } from "react";
import { brandPreview, formatRatio } from "@/lib/brand-preview";
import { Avatar, BrandScope } from "./Brand";
import { IconAlert, IconCheck } from "./icons";
import { buttonClass } from "./ui/button";

function Finding({ ok, children }: { ok: boolean; children: ReactNode }) {
  const Icon = ok ? IconCheck : IconAlert;
  return (
    <li className="flex items-start gap-2">
      {/* The icon repeats what the sentence says; the sentence carries the meaning, so colour is never the only signal. */}
      <Icon size={16} className={`mt-0.5 shrink-0 ${ok ? "text-good" : "text-bad"}`} />
      <span>{children}</span>
    </li>
  );
}

/**
 * What the picked colour does on the storefront, using the storefront's own derivation (BrandScope + lib/color via
 * `brandPreview`). The miniature is decorative (aria-hidden, nothing in it is interactive); the list under it says the
 * same things in words. No hooks and no browser APIs, so it renders on the server and the client alike.
 *
 * Two different "bad colour" messages, on purpose:
 * - `pending` (the colour box holds a half-typed or mistyped hex): `color` is still the last valid colour, so the
 *   preview and the findings describe THAT colour, and the first line says the box is not a colour yet.
 * - `!p.valid` (the `color` prop itself is not `#rrggbb`): the storefront falls back to ink. The settings page only
 *   gets here when the stored value in the database is corrupt (the write side accepts only `#rrggbb`), so this
 *   sentence is a safety net, not something a creator reaches by typing.
 */
export function BrandPreview({ color, storeName, pending = false }: { color: string; storeName: string; pending?: boolean }) {
  const p = brandPreview(color);
  return (
    <div role="group" aria-label="Storefront colour preview" className="border-y border-line py-4">
      <p className="t-label">Storefront preview</p>
      <div aria-hidden="true" className="mt-3 overflow-hidden rounded-card border border-line">
        <BrandScope color={color}>
          <div className="flex items-center gap-3 bg-brand-soft/60 px-4 py-3">
            <Avatar name={storeName || "S"} size={40} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{storeName || "Your store"}</p>
              <p className="t-meta">1 product</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 bg-surface px-4 py-3">
            <span className="font-semibold text-[color:var(--brand-text)]">View product</span>
            <span className={`${buttonClass({ variant: "primary", size: "sm" })} pointer-events-none`}>Buy now</span>
          </div>
        </BrandScope>
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        {pending && <Finding ok={false}>Not a six-digit hex yet; the preview shows your last valid colour.</Finding>}
        {!p.valid && (
          <Finding ok={false}>
            That is not a six-digit hex colour like #0f7b4d, so the storefront falls back to ink ({p.color}).
          </Finding>
        )}
        <Finding ok={p.buttonOk}>
          Button text will be {p.buttonTextName} ({formatRatio(p.buttonRatio)} on your colour).
          {!p.buttonOk && " That is under the 4.5:1 guideline, so a lighter or darker shade reads better."}
        </Finding>
        <Finding ok>
          {p.textAdjusted
            ? `Text in your colour uses a darker shade, ${p.textColor} (${formatRatio(p.textRatio)} on white), so it stays readable.`
            : `Text in your colour uses it as is (${formatRatio(p.textRatio)} on white).`}
        </Finding>
        <Finding ok>
          {p.ringAdjusted
            ? `Focus rings and progress bars use a darker shade, ${p.ringColor} (${formatRatio(p.ringRatio)} on white), so they stay visible.`
            : `Focus rings and progress bars use it as is (${formatRatio(p.ringRatio)} on white).`}
        </Finding>
      </ul>
    </div>
  );
}
