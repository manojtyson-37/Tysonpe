import { z } from "zod";

export interface StorefrontLink {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  icon?: string;
  badge?: string;
  isHighlighted?: boolean;
}

export interface StorefrontGalleryItem {
  id: string;
  title: string;
  caption?: string;
  imageUrl: string;
  link?: string;
  tag?: string;
}

export interface StorefrontTestimonial {
  id: string;
  name: string;
  role?: string;
  company?: string;
  avatarUrl?: string;
  rating: number;
  quote: string;
  highlight?: string;
}

export interface StorefrontFaq {
  id: string;
  question: string;
  answer: string;
}

export interface StorefrontStat {
  label: string;
  value: string;
  sub?: string;
}

export interface StorefrontSocialLinks {
  instagram?: string;
  youtube?: string;
  twitter?: string;
  linkedin?: string;
  telegram?: string;
  whatsapp?: string;
  website?: string;
  github?: string;
  substack?: string;
}

export interface StorefrontConfig {
  themePreset: "warm-paper" | "midnight" | "indigo" | "emerald" | "amber" | "rose";
  avatarUrl?: string;
  coverUrl?: string;
  coverPattern?: "grid" | "waves" | "mesh" | "clean";
  headline?: string;
  verifiedBadge?: string;
  location?: string;
  statusBadge?: string;

  announcement?: {
    enabled: boolean;
    text: string;
    link?: string;
    badge?: string;
  };

  socialLinks?: StorefrontSocialLinks;
  customLinks?: StorefrontLink[];

  about?: {
    enabled: boolean;
    title: string;
    content: string;
    credentials?: string[];
  };

  stats?: StorefrontStat[];
  gallery?: StorefrontGalleryItem[];
  testimonials?: StorefrontTestimonial[];
  faqs?: StorefrontFaq[];

  newsletter?: {
    enabled: boolean;
    title: string;
    subtitle: string;
    buttonText: string;
  };
}

export const storefrontSchema = z.object({
  themePreset: z.enum(["warm-paper", "midnight", "indigo", "emerald", "amber", "rose"]).default("warm-paper"),
  avatarUrl: z.string().trim().max(1000).optional().default(""),
  coverUrl: z.string().trim().max(1000).optional().default(""),
  coverPattern: z.enum(["grid", "waves", "mesh", "clean"]).default("grid"),
  headline: z.string().trim().max(160).optional().default(""),
  verifiedBadge: z.string().trim().max(60).optional().default(""),
  location: z.string().trim().max(80).optional().default(""),
  statusBadge: z.string().trim().max(80).optional().default(""),

  announcement: z.object({
    enabled: z.boolean().default(false),
    text: z.string().trim().max(240).default(""),
    link: z.string().trim().max(500).optional().default(""),
    badge: z.string().trim().max(40).optional().default(""),
  }).optional(),

  socialLinks: z.object({
    instagram: z.string().trim().max(500).optional().default(""),
    youtube: z.string().trim().max(500).optional().default(""),
    twitter: z.string().trim().max(500).optional().default(""),
    linkedin: z.string().trim().max(500).optional().default(""),
    telegram: z.string().trim().max(500).optional().default(""),
    whatsapp: z.string().trim().max(500).optional().default(""),
    website: z.string().trim().max(500).optional().default(""),
    github: z.string().trim().max(500).optional().default(""),
    substack: z.string().trim().max(500).optional().default(""),
  }).optional(),

  customLinks: z.array(z.object({
    id: z.string(),
    title: z.string().trim().min(1, "Link title required").max(100),
    subtitle: z.string().trim().max(160).optional().default(""),
    url: z.string().trim().min(1, "URL required").max(1000),
    icon: z.string().max(40).optional().default("link"),
    badge: z.string().max(30).optional().default(""),
    isHighlighted: z.boolean().optional().default(false),
  })).max(20).default([]),

  about: z.object({
    enabled: z.boolean().default(true),
    title: z.string().trim().max(100).default("About Me"),
    content: z.string().trim().max(4000).default(""),
    credentials: z.array(z.string().trim().max(80)).max(10).default([]),
  }).optional(),

  stats: z.array(z.object({
    label: z.string().trim().max(50),
    value: z.string().trim().max(30),
    sub: z.string().trim().max(60).optional(),
  })).max(6).default([]),

  gallery: z.array(z.object({
    id: z.string(),
    title: z.string().trim().max(100),
    caption: z.string().trim().max(240).optional(),
    imageUrl: z.string().trim().max(1000),
    link: z.string().trim().max(1000).optional(),
    tag: z.string().trim().max(40).optional(),
  })).max(12).default([]),

  testimonials: z.array(z.object({
    id: z.string(),
    name: z.string().trim().max(80),
    role: z.string().trim().max(80).optional(),
    company: z.string().trim().max(80).optional(),
    avatarUrl: z.string().trim().max(1000).optional(),
    rating: z.number().int().min(1).max(5).default(5),
    quote: z.string().trim().max(800),
    highlight: z.string().trim().max(80).optional(),
  })).max(12).default([]),

  faqs: z.array(z.object({
    id: z.string(),
    question: z.string().trim().max(200),
    answer: z.string().trim().max(2000),
  })).max(20).default([]),

  newsletter: z.object({
    enabled: z.boolean().default(true),
    title: z.string().trim().max(100).default("Get Weekly Updates"),
    subtitle: z.string().trim().max(240).default("Join thousands of learners receiving practical frameworks every Sunday."),
    buttonText: z.string().trim().max(50).default("Subscribe Free"),
  }).optional(),
});

export function getDefaultStorefrontConfig(creator: {
  displayName: string;
  bio?: string | null;
  handle: string;
}): StorefrontConfig {
  const isAsha = creator.handle === "asha-rao" || creator.displayName.toLowerCase().includes("asha");

  if (isAsha) {
    return {
      themePreset: "emerald",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
      coverUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80",
      coverPattern: "grid",
      headline: "Chartered Accountant & Wealth Educator for Salaried Tech Professionals",
      verifiedBadge: "CA & SEBI Registered Educator",
      location: "Bangalore, India",
      statusBadge: "⚡ 2026 Tax Season Ready",
      announcement: {
        enabled: true,
        badge: "TAX SEASON 2026",
        text: "New Section 115BAC vs Old Regime calculator updated with FY 2026-27 rules.",
        link: `/c/${creator.handle}/tax-saving-checklist`,
      },
      socialLinks: {
        youtube: "https://youtube.com/@asharaomoney",
        instagram: "https://instagram.com/asharaomoney",
        twitter: "https://x.com/asharao",
        linkedin: "https://linkedin.com/in/asharao",
        telegram: "https://t.me/ashamoneycircle",
        website: "https://asharao.in",
      },
      customLinks: [
        {
          id: "link-1",
          title: "📅 Book 1:1 Financial Strategy Consultation",
          subtitle: "45-min Zoom deep dive into your salary slips, RSUs, and tax leaks",
          url: "https://topmate.io/asha_rao",
          icon: "calendar",
          badge: "POPULAR",
          isHighlighted: true,
        },
        {
          id: "link-2",
          title: "💬 Join Free Wealth Circle Telegram Channel",
          subtitle: "45,000+ salaried engineers sharing real SIP allocations and tax queries",
          url: "https://t.me/ashamoneycircle",
          icon: "telegram",
          badge: "FREE",
          isHighlighted: false,
        },
        {
          id: "link-3",
          title: "📰 Read the Sunday Wealth Dispatch",
          subtitle: "Every Sunday morning: 1 tax reduction playbook & 1 index fund analysis",
          url: "https://asharao.substack.com",
          icon: "newsletter",
          badge: "WEEKLY",
          isHighlighted: false,
        },
      ],
      about: {
        enabled: true,
        title: "About Asha Rao",
        content:
          "After spending 10 years at Big-4 accounting firms advising Fortune 500 corporations, I noticed that high-earning software engineers and product managers lose ₹1.5L to ₹4L every year to easily avoidable tax traps and dormant savings accounts.\n\nI built Tysonpe Wealth to eliminate that leakage. No stock tips, no crypto speculation—just institutional financial hygiene, bulletproof tax planning, and automated index investing tailored for India.",
        credentials: [
          "FCA Chartered Accountant (ICAI)",
          "12,400+ Salaried Tech Professionals Mentored",
          "Featured in The Economic Times & Mint",
          "Zero-Jargon, Action-First Guarantee",
        ],
      },
      stats: [
        { label: "Learners Trained", value: "12,400+", sub: "across 45+ tech hubs" },
        { label: "Tax Saved Legally", value: "₹4.8 Cr+", sub: "in FY 2025-26" },
        { label: "Student Rating", value: "4.92 ★", sub: "from 1,480+ verified buyers" },
        { label: "Instant GST Invoices", value: "100%", sub: "employer reimbursement ready" },
      ],
      gallery: [
        {
          id: "gal-1",
          title: "Bangalore Tech Summit 2026",
          caption: "Keynote on 'Navigating RSUs, Foreign Tax Credit & Section 80C' to 1,200 techies.",
          imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
          tag: "Speaking",
        },
        {
          id: "gal-2",
          title: "Live Masterclass Cohort 14",
          caption: "Weekly live Q&A session with 300 active wealth circle participants.",
          imageUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80",
          tag: "Community",
        },
        {
          id: "gal-3",
          title: "Featured in Economic Times Wealth",
          caption: "Front-page column on legal tax arbitrage between old and new regimes.",
          imageUrl: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80",
          tag: "Press",
        },
      ],
      testimonials: [
        {
          id: "t-1",
          name: "Vikram Sharma",
          role: "Staff Software Engineer",
          company: "Google India",
          avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
          rating: 5,
          quote:
            "Asha's masterclass saved me ₹1.4 Lakhs in taxes this year alone. Her RSU foreign tax credit spreadsheet is worth 10x the course fee. The clearest financial educator in India by a mile.",
          highlight: "Saved ₹1.4 Lakhs in taxes",
        },
        {
          id: "t-2",
          name: "Pooja Hegde",
          role: "Lead Product Designer",
          company: "CRED",
          avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80",
          rating: 5,
          quote:
            "Before Wealth Circle, I had all my money idling in fixed deposits. Within 3 weeks, I automated my monthly SIPs, restructured my HRA claims, and finally feel confident about early retirement.",
          highlight: "Automated monthly SIPs & early retirement plan",
        },
        {
          id: "t-3",
          name: "Rohan Nair",
          role: "VP Engineering",
          company: "Swiggy",
          avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80",
          rating: 5,
          quote:
            "Got full reimbursement from my employer using Tysonpe's instant GST invoice. The checklists are pure gold—concise, pragmatic, and 100% compliant with the latest finance act.",
          highlight: "Employer reimbursement with GST invoice",
        },
      ],
      faqs: [
        {
          id: "faq-1",
          question: "How do I access the digital download or course after payment?",
          answer:
            "Instantly! As soon as your UPI, card, or netbanking payment succeeds, your products are automatically unlocked in your Tysonpe library with lifetime access, download links, and direct community channels.",
        },
        {
          id: "faq-2",
          question: "Can I get an official GST tax invoice for employer reimbursement?",
          answer:
            "Yes! Every purchase immediately generates a compliant GST invoice complete with HSN/SAC codes, CGST/SGST/IGST breakdown, and your company GSTIN if entered at checkout.",
        },
        {
          id: "faq-3",
          question: "Are the checklists updated for the 2026-2027 fiscal year?",
          answer:
            "Yes, all worksheets and guides include the latest tax slabs, Section 87A rebate rules, NPS Tier-1 limits, and capital gains surcharge caps under the new union budget.",
        },
        {
          id: "faq-4",
          question: "Can I ask questions if I need clarification on my portfolio?",
          answer:
            "Yes! Enrolling in any course or membership grants you access to our customer community where you can post questions in dedicated channels and participate in monthly live Q&As.",
        },
      ],
      newsletter: {
        enabled: true,
        title: "Get The Weekly Wealth Dispatch",
        subtitle: "Every Sunday at 9 AM: 1 tax reduction framework, 1 index investing tip, and zero marketing fluff. Free forever.",
        buttonText: "Subscribe Free",
      },
    };
  }

  // Generic fallback for any creator
  return {
    themePreset: "warm-paper",
    avatarUrl: "",
    coverUrl: "",
    coverPattern: "grid",
    headline: creator.bio || `Official storefront of ${creator.displayName}`,
    verifiedBadge: "Verified Creator",
    location: "India",
    statusBadge: "✨ Active Store",
    announcement: {
      enabled: false,
      badge: "ANNOUNCEMENT",
      text: `Welcome to ${creator.displayName}'s official store. Explore digital downloads and courses.`,
      link: "",
    },
    socialLinks: {
      website: "",
      twitter: "",
      youtube: "",
      instagram: "",
      linkedin: "",
    },
    customLinks: [],
    about: {
      enabled: !!creator.bio,
      title: `About ${creator.displayName}`,
      content: creator.bio || `Welcome to my storefront! Browse my latest digital products, guides, and courses below.`,
      credentials: ["Creator on Tysonpe", "Verified Creator"],
    },
    stats: [
      { label: "Community", value: "Verified", sub: "Creator" },
      { label: "Instant Access", value: "100%", sub: "Immediate delivery" },
      { label: "Secure Payments", value: "UPI & Cards", sub: "RBI Compliant" },
    ],
    gallery: [],
    testimonials: [],
    faqs: [
      {
        id: "faq-1",
        question: "How do I access my purchase?",
        answer: "Immediately after checkout, your purchase appears in 'My Library' where you can read, stream, or download your materials.",
      },
      {
        id: "faq-2",
        question: "Which payment methods are supported?",
        answer: "We support all major Indian payment methods: UPI (Google Pay, PhonePe, Paytm, BHIM), RuPay, Visa, Mastercard, and Netbanking.",
      },
      {
        id: "faq-3",
        question: "Do I get an invoice for my purchase?",
        answer: "Yes, an official GST tax invoice is generated instantly and available in your orders dashboard.",
      },
    ],
    newsletter: {
      enabled: true,
      title: `Join ${creator.displayName}'s Newsletter`,
      subtitle: "Get exclusive updates, discounts, and insights delivered straight to your inbox.",
      buttonText: "Subscribe Free",
    },
  };
}

export function parseStorefrontConfig(
  rawJson: string | null | undefined,
  creator: { displayName: string; bio?: string | null; handle: string }
): StorefrontConfig {
  const defaults = getDefaultStorefrontConfig(creator);
  if (!rawJson) return defaults;

  try {
    const parsed = JSON.parse(rawJson);
    const valid = storefrontSchema.safeParse(parsed);
    if (!valid.success) {
      console.warn("Storefront config validation issues:", valid.error.format());
      return { ...defaults, ...parsed } as StorefrontConfig;
    }
    const ann = valid.data.announcement;
    const ab = valid.data.about;
    const nl = valid.data.newsletter;

    return {
      ...defaults,
      ...valid.data,
      announcement: {
        enabled: ann?.enabled ?? defaults.announcement?.enabled ?? false,
        text: ann?.text ?? defaults.announcement?.text ?? "",
        link: ann?.link ?? defaults.announcement?.link,
        badge: ann?.badge ?? defaults.announcement?.badge,
      },
      about: {
        enabled: ab?.enabled ?? defaults.about?.enabled ?? false,
        title: ab?.title ?? defaults.about?.title ?? "",
        content: ab?.content ?? defaults.about?.content ?? "",
        credentials: ab?.credentials ?? defaults.about?.credentials,
      },
      socialLinks: { ...defaults.socialLinks, ...(valid.data.socialLinks || {}) },
      newsletter: {
        enabled: nl?.enabled ?? defaults.newsletter?.enabled ?? false,
        title: nl?.title ?? defaults.newsletter?.title ?? "",
        subtitle: nl?.subtitle ?? defaults.newsletter?.subtitle ?? "",
        buttonText: nl?.buttonText ?? defaults.newsletter?.buttonText ?? "Subscribe Free",
      },
      customLinks: valid.data.customLinks?.length ? valid.data.customLinks : defaults.customLinks,
      stats: valid.data.stats?.length ? valid.data.stats : defaults.stats,
      gallery: valid.data.gallery?.length ? valid.data.gallery : defaults.gallery,
      testimonials: valid.data.testimonials?.length ? valid.data.testimonials : defaults.testimonials,
      faqs: valid.data.faqs?.length ? valid.data.faqs : defaults.faqs,
    };
  } catch (err) {
    console.error("Failed to parse storefrontConfig JSON:", err);
    return defaults;
  }
}
