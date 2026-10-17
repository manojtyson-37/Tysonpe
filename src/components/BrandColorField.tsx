"use client";

import { useState, type FormEvent } from "react";
import { isPendingHex } from "@/lib/brand-preview";
import { BrandPreview } from "./BrandPreview";
import { ColorField } from "./form";

/**
 * The settings colour control: ColorField (hex text input plus native picker) and a preview that follows it.
 * ColorField reports a colour only once it is a valid `#rrggbb`, so while someone is mid-typing the preview holds
 * the last valid colour; the submitted `brandColor` is always what the text input shows. ColorField gives no signal for
 * the in-between state, so the wrapper listens to the bubbling `input` event: when it comes from the hex text box, the
 * box's value is judged by the same rule as the storefront (`isPendingHex`) and the preview says the colour is not valid
 * yet. The native picker always yields a valid colour, so an event from it (or a valid emit) clears the flag.
 *
 * Assistive tech: while the flag is up the field gets an `error`, which ColorField turns into `aria-invalid` on the hex
 * text input plus a described-by message, and BrandPreview lists its findings in a polite live region. A screen-reader
 * user typing "#12" is told the box is not a colour yet instead of hearing nothing change.
 */
export function BrandColorField({ defaultColor, storeName }: { defaultColor: string; storeName: string }) {
  const [color, setColor] = useState(defaultColor);
  const [pending, setPending] = useState(false);
  const onInput = (e: FormEvent<HTMLDivElement>) => {
    const t = e.target as { tagName?: string; type?: string; value?: string } | null;
    if (!t || t.tagName !== "INPUT") return;
    if (t.type === "text") setPending(isPendingHex(t.value ?? ""));
    else if (t.type === "color") setPending(false);
  };
  return (
    <div className="space-y-4" onInput={onInput}>
      <ColorField
        name="brandColor"
        label="Brand colour"
        defaultValue={defaultColor}
        hint="Buttons and accents on your storefront use this colour."
        required
        error={pending ? "Enter six digits, like #0f7b4d." : undefined}
        onChange={(hex) => {
          setColor(hex);
          setPending(false);
        }}
      />
      <BrandPreview color={color} storeName={storeName} pending={pending} />
    </div>
  );
}
