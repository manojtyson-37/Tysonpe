"use client";

import { useState } from "react";
import { BrandPreview } from "./BrandPreview";
import { ColorField } from "./form";

/**
 * The settings colour control: ColorField (hex text input plus native picker) and a preview that follows it.
 * ColorField reports a colour only once it is a valid `#rrggbb`, so while someone is mid-typing the preview holds
 * the last valid colour; the submitted `brandColor` is always what the text input shows.
 */
export function BrandColorField({ defaultColor, storeName }: { defaultColor: string; storeName: string }) {
  const [color, setColor] = useState(defaultColor);
  return (
    <div className="space-y-4">
      <ColorField
        name="brandColor"
        label="Brand colour"
        defaultValue={defaultColor}
        hint="Buttons and accents on your storefront use this colour."
        required
        onChange={setColor}
      />
      <BrandPreview color={color} storeName={storeName} />
    </div>
  );
}
