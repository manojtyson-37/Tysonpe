import type { Metadata } from "next";
import { requireCreator } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { parseStorefrontConfig } from "@/lib/storefront";
import { StorefrontEditor } from "@/components/storefront/StorefrontEditor";

export const metadata: Metadata = {
  title: "Storefront Customizer Studio",
  description: "Customize your creator storefront landing page, links, texts, pictures, and social proof.",
};

export default async function DashboardStorefrontPage() {
  const { creator } = await requireCreator();

  const fullCreator = await db.creator.findUniqueOrThrow({
    where: { id: creator.id },
    include: {
      products: {
        where: { status: "published" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          tagline: true,
          type: true,
          pricePaise: true,
          billing: true,
        },
      },
      _count: {
        select: { channels: true },
      },
    },
  });

  const initialConfig = parseStorefrontConfig(fullCreator.storefrontConfig, fullCreator);

  return (
    <StorefrontEditor
      creator={{
        id: fullCreator.id,
        handle: fullCreator.handle,
        displayName: fullCreator.displayName,
        bio: fullCreator.bio,
        brandColor: fullCreator.brandColor,
        products: fullCreator.products,
        channelsCount: fullCreator._count.channels,
      }}
      initialConfig={initialConfig}
    />
  );
}
