import { describe, expect, it } from "vitest";
import {
  getDefaultStorefrontConfig,
  parseStorefrontConfig,
  storefrontSchema,
} from "./storefront";

describe("storefront lib", () => {
  const asha = {
    displayName: "Asha Rao",
    bio: "Chartered accountant turned money coach.",
    handle: "asha-rao",
  };

  const genericCreator = {
    displayName: "Rahul Sen",
    bio: "Tech educator and full stack developer.",
    handle: "rahul-sen",
  };

  it("generates rich default config for asha-rao with complete fintech presets", () => {
    const config = getDefaultStorefrontConfig(asha);
    expect(config.headline).toContain("Chartered Accountant");
    expect(config.verifiedBadge).toBe("CA & SEBI Registered Educator");
    expect(config.customLinks?.length).toBeGreaterThanOrEqual(3);
    expect(config.testimonials?.length).toBeGreaterThanOrEqual(3);
    expect(config.faqs?.length).toBeGreaterThanOrEqual(4);
    expect(config.gallery?.length).toBeGreaterThanOrEqual(3);
    expect(config.stats?.length).toBeGreaterThanOrEqual(4);
    expect(config.socialLinks?.youtube).toBe("https://youtube.com/@asharaomoney");
    expect(config.announcement?.enabled).toBe(true);
    expect(config.announcement?.badge).toBe("TAX SEASON 2026");
  });

  it("generates generic default config for any new creator", () => {
    const config = getDefaultStorefrontConfig(genericCreator);
    expect(config.headline).toBe(genericCreator.bio);
    expect(config.verifiedBadge).toBe("Verified Creator");
    expect(config.faqs?.length).toBeGreaterThanOrEqual(3);
    expect(config.announcement?.enabled).toBe(false);
  });

  it("parses valid custom JSON and merges with defaults safely", () => {
    const customJson = JSON.stringify({
      headline: "Customized Master Educator",
      customLinks: [
        {
          id: "link-custom",
          title: "Book Mentorship Session",
          url: "https://topmate.io/custom",
          badge: "NEW",
          isHighlighted: true,
        },
      ],
      socialLinks: {
        twitter: "https://x.com/custom_handle",
      },
    });

    const parsed = parseStorefrontConfig(customJson, genericCreator);
    expect(parsed.headline).toBe("Customized Master Educator");
    expect(parsed.customLinks?.[0]?.title).toBe("Book Mentorship Session");
    expect(parsed.socialLinks?.twitter).toBe("https://x.com/custom_handle");
    // Defaults filled in for missing sections
    expect(parsed.faqs?.length).toBeGreaterThanOrEqual(3);
  });

  it("falls back gracefully when given invalid or corrupted JSON", () => {
    const corrupted = "{ bad json string";
    const parsed = parseStorefrontConfig(corrupted, asha);
    expect(parsed.headline).toContain("Chartered Accountant");
    expect(parsed.customLinks?.length).toBeGreaterThanOrEqual(3);
  });

  it("validates schema correctly using storefrontSchema", () => {
    const valid = storefrontSchema.safeParse({
      themePreset: "indigo",
      headline: "Headline text",
      customLinks: [
        { id: "1", title: "Test Link", url: "https://example.com" },
      ],
    });
    expect(valid.success).toBe(true);

    const invalid = storefrontSchema.safeParse({
      themePreset: "invalid-theme-preset",
    });
    expect(invalid.success).toBe(false);
  });
});
