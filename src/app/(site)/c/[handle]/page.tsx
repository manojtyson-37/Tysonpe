import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandScope } from "@/components/Brand";
import { db } from "@/lib/db";
import { parseStorefrontConfig } from "@/lib/storefront";
import { AnnouncementBar } from "@/components/storefront/AnnouncementBar";
import { StorefrontHero } from "@/components/storefront/StorefrontHero";
import { QuickLinksSection } from "@/components/storefront/QuickLinksSection";
import { ProductsSection } from "@/components/storefront/ProductsSection";
import { AboutSection } from "@/components/storefront/AboutSection";
import { MediaGallerySection } from "@/components/storefront/MediaGallerySection";
import { TestimonialsSection } from "@/components/storefront/TestimonialsSection";
import { FaqSection } from "@/components/storefront/FaqSection";
import { NewsletterSection } from "@/components/storefront/NewsletterSection";
import { StorefrontFooter } from "@/components/storefront/StorefrontFooter";

async function getCreator(handle: string) {
  return db.creator.findUnique({
    where: { handle: handle.toLowerCase() },
    include: {
      products: { where: { status: "published" }, orderBy: { createdAt: "desc" } },
      _count: { select: { channels: true } },
    },
  });
}

export async function generateMetadata({ params }: PageProps<"/c/[handle]">): Promise<Metadata> {
  const c = await getCreator((await params).handle);
  if (!c) return {};
  const config = parseStorefrontConfig(c.storefrontConfig, c);
  return {
    title: `${c.displayName} — Official Storefront`,
    description: config.headline || c.bio || `Shop courses, downloads & memberships by ${c.displayName} on Tysonpe`,
  };
}

export default async function StorefrontPage({ params }: PageProps<"/c/[handle]">) {
  const creator = await getCreator((await params).handle);
  if (!creator) notFound();

  const config = parseStorefrontConfig(creator.storefrontConfig, creator);

  return (
    <BrandScope color={creator.brandColor}>
      <div className="min-h-screen bg-bg text-ink selection:bg-brand selection:text-brand-ink">
        {/* 1. Announcement Bar */}
        <AnnouncementBar announcement={config.announcement} />

        {/* 2. Hero & Profile Header */}
        <StorefrontHero
          creator={{
            displayName: creator.displayName,
            handle: creator.handle,
            bio: creator.bio,
            brandColor: creator.brandColor,
            productsCount: creator.products.length,
            channelsCount: creator._count.channels,
          }}
          config={config}
        />

        {/* 3. Featured Quick Links (Linktree / Stan style) */}
        <QuickLinksSection links={config.customLinks} />

        {/* 4. Products Showcase with Interactive Filtering */}
        <ProductsSection
          products={creator.products}
          creatorHandle={creator.handle}
        />

        {/* 5. Rich About Me & Stats Counters */}
        <AboutSection
          about={config.about}
          stats={config.stats}
          creatorName={creator.displayName}
        />

        {/* 6. Pictures & Media Showcase (Workshops, Speaking, Press) */}
        <MediaGallerySection items={config.gallery} />

        {/* 7. Testimonials & Social Proof */}
        <TestimonialsSection testimonials={config.testimonials} />

        {/* 8. Interactive FAQ Accordion */}
        <FaqSection faqs={config.faqs} />

        {/* 9. Freebie / Newsletter Lead Capture */}
        <NewsletterSection newsletter={config.newsletter} />

        {/* 10. Fintech Trust & Security Badges */}
        <StorefrontFooter creatorName={creator.displayName} />
      </div>
    </BrandScope>
  );
}
