"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { saveStorefrontAction, updateProfile } from "@/app/actions/creator";
import type { StorefrontConfig, StorefrontLink, StorefrontGalleryItem, StorefrontTestimonial, StorefrontFaq, StorefrontStat } from "@/lib/storefront";
import { BrandScope } from "@/components/Brand";
import { AnnouncementBar } from "./AnnouncementBar";
import { StorefrontHero } from "./StorefrontHero";
import { QuickLinksSection } from "./QuickLinksSection";
import { ProductsSection } from "./ProductsSection";
import { AboutSection } from "./AboutSection";
import { MediaGallerySection } from "./MediaGallerySection";
import { TestimonialsSection } from "./TestimonialsSection";
import { FaqSection } from "./FaqSection";
import { NewsletterSection } from "./NewsletterSection";
import { StorefrontFooter } from "./StorefrontFooter";

interface StorefrontEditorProps {
  creator: {
    id: string;
    handle: string;
    displayName: string;
    bio: string;
    brandColor: string;
    products: Array<{
      id: string;
      slug: string;
      title: string;
      tagline: string | null;
      type: string;
      pricePaise: number;
      billing: string;
    }>;
    channelsCount: number;
  };
  initialConfig: StorefrontConfig;
}

export function StorefrontEditor({ creator, initialConfig }: StorefrontEditorProps) {
  const [config, setConfig] = useState<StorefrontConfig>(initialConfig);
  const [displayName, setDisplayName] = useState(creator.displayName);
  const [bio, setBio] = useState(creator.bio);
  const [brandColor, setBrandColor] = useState(creator.brandColor);

  const [activeTab, setActiveTab] = useState<"branding" | "links" | "story" | "pictures" | "proof" | "announcements">("branding");
  const [showPreview, setShowPreview] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = () => {
    setSaveError(null);
    setSavedSuccess(false);

    startTransition(async () => {
      // 1. Update basic profile
      const fd = new FormData();
      fd.append("displayName", displayName);
      fd.append("bio", bio);
      fd.append("brandColor", brandColor);
      await updateProfile(undefined, fd);

      // 2. Save rich storefront config
      const res = await saveStorefrontAction(config);
      if (res && !res.ok) {
        setSaveError(res.error || "Failed to save storefront");
      } else {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    });
  };

  /* Helper methods to update links, gallery, testimonials, faqs */
  const addQuickLink = () => {
    const newLink: StorefrontLink = {
      id: "link-" + Date.now(),
      title: "New Featured Link",
      subtitle: "Click to learn more",
      url: "https://",
      icon: "link",
      badge: "",
      isHighlighted: false,
    };
    setConfig((c) => ({ ...c, customLinks: [...(c.customLinks || []), newLink] }));
  };

  const removeQuickLink = (id: string) => {
    setConfig((c) => ({
      ...c,
      customLinks: (c.customLinks || []).filter((l) => l.id !== id),
    }));
  };

  const updateQuickLink = (id: string, patch: Partial<StorefrontLink>) => {
    setConfig((c) => ({
      ...c,
      customLinks: (c.customLinks || []).map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  };

  const addGalleryItem = () => {
    const newItem: StorefrontGalleryItem = {
      id: "gal-" + Date.now(),
      title: "Workshop & Event",
      caption: "Interactive learning session with participants",
      imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
      tag: "Live",
    };
    setConfig((c) => ({ ...c, gallery: [...(c.gallery || []), newItem] }));
  };

  const removeGalleryItem = (id: string) => {
    setConfig((c) => ({
      ...c,
      gallery: (c.gallery || []).filter((g) => g.id !== id),
    }));
  };

  const updateGalleryItem = (id: string, patch: Partial<StorefrontGalleryItem>) => {
    setConfig((c) => ({
      ...c,
      gallery: (c.gallery || []).map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));
  };

  const addTestimonial = () => {
    const newT: StorefrontTestimonial = {
      id: "t-" + Date.now(),
      name: "Student Name",
      role: "Professional Role",
      company: "Company",
      rating: 5,
      quote: "Outstanding course that gave me immediate clarity and practical results.",
      highlight: "Highly Recommended",
    };
    setConfig((c) => ({ ...c, testimonials: [...(c.testimonials || []), newT] }));
  };

  const removeTestimonial = (id: string) => {
    setConfig((c) => ({
      ...c,
      testimonials: (c.testimonials || []).filter((t) => t.id !== id),
    }));
  };

  const updateTestimonial = (id: string, patch: Partial<StorefrontTestimonial>) => {
    setConfig((c) => ({
      ...c,
      testimonials: (c.testimonials || []).map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  };

  const addFaq = () => {
    const newFaq: StorefrontFaq = {
      id: "faq-" + Date.now(),
      question: "How do I get started?",
      answer: "Choose any product above and complete checkout to get instant access.",
    };
    setConfig((c) => ({ ...c, faqs: [...(c.faqs || []), newFaq] }));
  };

  const removeFaq = (id: string) => {
    setConfig((c) => ({
      ...c,
      faqs: (c.faqs || []).filter((f) => f.id !== id),
    }));
  };

  const updateFaq = (id: string, patch: Partial<StorefrontFaq>) => {
    setConfig((c) => ({
      ...c,
      faqs: (c.faqs || []).map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  };

  const updateStat = (index: number, patch: Partial<StorefrontStat>) => {
    const stats = [...(config.stats || [])];
    if (stats[index]) {
      stats[index] = { ...stats[index], ...patch };
      setConfig((c) => ({ ...c, stats }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4 shadow-2xs sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
              Storefront Customizer Studio
            </h1>
            <span className="badge badge-brand text-[10px] font-bold">LIVE EDITOR</span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Customize texts, pictures, links, testimonials, and brand styling for your public landing page.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="btn btn-secondary btn-sm"
          >
            {showPreview ? "Hide Preview" : "Live Storefront Preview"}
          </button>
          <Link
            href={`/c/${creator.handle}`}
            target="_blank"
            className="btn btn-secondary btn-sm"
          >
            Open Storefront ↗
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="btn btn-primary btn-sm"
          >
            {isPending ? "Saving changes..." : "Save Storefront"}
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="rounded-xl bg-good-soft px-4 py-3 text-xs font-semibold text-good">
          ✓ Storefront settings and customizations saved successfully!
        </div>
      )}

      {saveError && (
        <div className="rounded-xl bg-bad-soft px-4 py-3 text-xs font-semibold text-bad">
          {saveError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-line gap-2 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("branding")}
          className={`cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === "branding"
              ? "bg-brand text-brand-ink shadow-xs"
              : "text-muted hover:bg-surface-2 hover:text-ink"
          }`}
        >
          1. Profile & Branding
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("links")}
          className={`cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === "links"
              ? "bg-brand text-brand-ink shadow-xs"
              : "text-muted hover:bg-surface-2 hover:text-ink"
          }`}
        >
          2. Links & Socials ({config.customLinks?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("story")}
          className={`cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === "story"
              ? "bg-brand text-brand-ink shadow-xs"
              : "text-muted hover:bg-surface-2 hover:text-ink"
          }`}
        >
          3. Texts, Story & Stats
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("pictures")}
          className={`cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === "pictures"
              ? "bg-brand text-brand-ink shadow-xs"
              : "text-muted hover:bg-surface-2 hover:text-ink"
          }`}
        >
          4. Pictures & Gallery ({config.gallery?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("proof")}
          className={`cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === "proof"
              ? "bg-brand text-brand-ink shadow-xs"
              : "text-muted hover:bg-surface-2 hover:text-ink"
          }`}
        >
          5. Testimonials & FAQs
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("announcements")}
          className={`cursor-pointer whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition ${
            activeTab === "announcements"
              ? "bg-brand text-brand-ink shadow-xs"
              : "text-muted hover:bg-surface-2 hover:text-ink"
          }`}
        >
          6. Banner & Newsletter
        </button>
      </div>

      {/* Tab Panels */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className={showPreview ? "lg:col-span-6 space-y-6" : "lg:col-span-12 space-y-6"}>
          {/* TAB 1: Profile & Branding */}
          {activeTab === "branding" && (
            <div className="card space-y-5 p-6">
              <h2 className="text-base font-bold text-ink">Creator Identity & Branding</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Store Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="label">Store Handle (URL path)</label>
                  <input
                    type="text"
                    value={creator.handle}
                    disabled
                    className="input bg-surface-2 text-muted"
                  />
                  <p className="hint">Store URL: /c/{creator.handle}</p>
                </div>
              </div>

              <div>
                <label className="label">Headline / Sub-title</label>
                <input
                  type="text"
                  value={config.headline || ""}
                  onChange={(e) => setConfig({ ...config, headline: e.target.value })}
                  placeholder="e.g. Chartered Accountant & Wealth Coach for Salaried Professionals"
                  className="input"
                />
                <p className="hint">Prominently displayed right under your store name.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">Verified Badge Title</label>
                  <input
                    type="text"
                    value={config.verifiedBadge || ""}
                    onChange={(e) => setConfig({ ...config, verifiedBadge: e.target.value })}
                    placeholder="e.g. CA & SEBI Registered"
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Location</label>
                  <input
                    type="text"
                    value={config.location || ""}
                    onChange={(e) => setConfig({ ...config, location: e.target.value })}
                    placeholder="e.g. Bangalore, India"
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Status Badge</label>
                  <input
                    type="text"
                    value={config.statusBadge || ""}
                    onChange={(e) => setConfig({ ...config, statusBadge: e.target.value })}
                    placeholder="e.g. ⚡ 2026 Tax Season Ready"
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Store Bio</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell buyers who you are and what you teach..."
                  className="input"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Avatar Picture URL</label>
                  <input
                    type="url"
                    value={config.avatarUrl || ""}
                    onChange={(e) => setConfig({ ...config, avatarUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="input"
                  />
                  <p className="hint">Leave empty to use your customized monogram avatar.</p>
                </div>

                <div>
                  <label className="label">Cover Banner Picture URL</label>
                  <input
                    type="url"
                    value={config.coverUrl || ""}
                    onChange={(e) => setConfig({ ...config, coverUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="input"
                  />
                  <p className="hint">Leave empty to use the sleek geometric canvas gradient.</p>
                </div>
              </div>

              <div>
                <label className="label">Brand Accent Colour</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="h-11 w-20 cursor-pointer rounded-xl border border-line bg-surface p-1"
                  />
                  <div className="flex flex-wrap gap-2">
                    {["#0f766e", "#4f46e5", "#0f172a", "#d97706", "#be185d", "#2563eb"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setBrandColor(c)}
                        style={{ backgroundColor: c }}
                        className="h-8 w-8 cursor-pointer rounded-lg ring-1 ring-line ring-offset-1 hover:scale-105 transition"
                        title={c}
                      />
                    ))}
                  </div>
                </div>
                <p className="hint">All buttons, active tabs, and accents across your store use this colour.</p>
              </div>
            </div>
          )}

          {/* TAB 2: Links & Socials */}
          {activeTab === "links" && (
            <div className="space-y-6">
              <div className="card space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-ink">Custom Link Buttons (Linktree / Stan style)</h2>
                    <p className="text-xs text-muted">Feature 1:1 consults, free groups, newsletters, or external sites.</p>
                  </div>
                  <button type="button" onClick={addQuickLink} className="btn btn-secondary btn-sm">
                    + Add New Link
                  </button>
                </div>

                {(!config.customLinks || config.customLinks.length === 0) ? (
                  <p className="text-xs text-muted italic">No custom links added yet. Click &ldquo;+ Add New Link&rdquo; to add one.</p>
                ) : (
                  <div className="space-y-3">
                    {config.customLinks.map((link) => (
                      <div key={link.id} className="rounded-xl border border-line p-4 space-y-3 bg-surface-2/40">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={link.title}
                            onChange={(e) => updateQuickLink(link.id, { title: e.target.value })}
                            placeholder="Link Title (e.g. Book 1:1 Session)"
                            className="input text-sm font-semibold flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => removeQuickLink(link.id)}
                            className="btn btn-danger btn-sm"
                          >
                            Delete
                          </button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <input
                            type="text"
                            value={link.subtitle || ""}
                            onChange={(e) => updateQuickLink(link.id, { subtitle: e.target.value })}
                            placeholder="Subtitle (e.g. 45-min Zoom consultation)"
                            className="input text-xs"
                          />
                          <input
                            type="url"
                            value={link.url}
                            onChange={(e) => updateQuickLink(link.id, { url: e.target.value })}
                            placeholder="Destination URL (https://...)"
                            className="input text-xs"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs">
                          <label className="flex items-center gap-1.5 font-medium text-ink">
                            <span>Icon:</span>
                            <select
                              value={link.icon || "link"}
                              onChange={(e) => updateQuickLink(link.id, { icon: e.target.value })}
                              className="rounded-lg border border-line bg-surface px-2 py-1 text-xs"
                            >
                              <option value="link">Link</option>
                              <option value="calendar">Calendar</option>
                              <option value="video">Video</option>
                              <option value="book">Book</option>
                              <option value="telegram">Telegram</option>
                              <option value="whatsapp">WhatsApp</option>
                              <option value="newsletter">Newsletter</option>
                              <option value="sparkles">Sparkles</option>
                            </select>
                          </label>

                          <label className="flex items-center gap-1.5 font-medium text-ink">
                            <span>Badge Pill:</span>
                            <input
                              type="text"
                              value={link.badge || ""}
                              onChange={(e) => updateQuickLink(link.id, { badge: e.target.value.toUpperCase() })}
                              placeholder="POPULAR / FREE"
                              className="rounded-lg border border-line bg-surface px-2 py-1 text-xs w-28 uppercase"
                            />
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer text-ink font-medium">
                            <input
                              type="checkbox"
                              checked={!!link.isHighlighted}
                              onChange={(e) => updateQuickLink(link.id, { isHighlighted: e.target.checked })}
                              className="h-4 w-4 rounded accent-brand"
                            />
                            <span>Highlight Button</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Social Channels */}
              <div className="card space-y-4 p-6">
                <h2 className="text-base font-bold text-ink">Social Media Profile Links</h2>
                <p className="text-xs text-muted">Displays custom vector icons in your storefront hero section.</p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">YouTube Channel URL</label>
                    <input
                      type="url"
                      value={config.socialLinks?.youtube || ""}
                      onChange={(e) => setConfig({ ...config, socialLinks: { ...config.socialLinks, youtube: e.target.value } })}
                      placeholder="https://youtube.com/@channel"
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="label">Instagram Profile URL</label>
                    <input
                      type="url"
                      value={config.socialLinks?.instagram || ""}
                      onChange={(e) => setConfig({ ...config, socialLinks: { ...config.socialLinks, instagram: e.target.value } })}
                      placeholder="https://instagram.com/username"
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="label">X / Twitter URL</label>
                    <input
                      type="url"
                      value={config.socialLinks?.twitter || ""}
                      onChange={(e) => setConfig({ ...config, socialLinks: { ...config.socialLinks, twitter: e.target.value } })}
                      placeholder="https://x.com/username"
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="label">LinkedIn Profile URL</label>
                    <input
                      type="url"
                      value={config.socialLinks?.linkedin || ""}
                      onChange={(e) => setConfig({ ...config, socialLinks: { ...config.socialLinks, linkedin: e.target.value } })}
                      placeholder="https://linkedin.com/in/username"
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="label">Telegram Channel / Group URL</label>
                    <input
                      type="url"
                      value={config.socialLinks?.telegram || ""}
                      onChange={(e) => setConfig({ ...config, socialLinks: { ...config.socialLinks, telegram: e.target.value } })}
                      placeholder="https://t.me/channel"
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="label">WhatsApp Direct Chat URL</label>
                    <input
                      type="url"
                      value={config.socialLinks?.whatsapp || ""}
                      onChange={(e) => setConfig({ ...config, socialLinks: { ...config.socialLinks, whatsapp: e.target.value } })}
                      placeholder="https://wa.me/91..."
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="label">Personal Website URL</label>
                    <input
                      type="url"
                      value={config.socialLinks?.website || ""}
                      onChange={(e) => setConfig({ ...config, socialLinks: { ...config.socialLinks, website: e.target.value } })}
                      placeholder="https://yourwebsite.com"
                      className="input text-xs"
                    />
                  </div>
                  <div>
                    <label className="label">Substack / Newsletter URL</label>
                    <input
                      type="url"
                      value={config.socialLinks?.substack || ""}
                      onChange={(e) => setConfig({ ...config, socialLinks: { ...config.socialLinks, substack: e.target.value } })}
                      placeholder="https://newsletter.substack.com"
                      className="input text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Story & Stats */}
          {activeTab === "story" && (
            <div className="space-y-6">
              <div className="card space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-ink">Creator Story & Background Section</h2>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-ink">
                    <input
                      type="checkbox"
                      checked={config.about?.enabled !== false}
                      onChange={(e) => setConfig({ ...config, about: { ...config.about, enabled: e.target.checked, title: config.about?.title || "About Me", content: config.about?.content || "" } })}
                      className="h-4 w-4 rounded accent-brand"
                    />
                    <span>Section Enabled</span>
                  </label>
                </div>

                <div>
                  <label className="label">Section Headline</label>
                  <input
                    type="text"
                    value={config.about?.title || ""}
                    onChange={(e) => setConfig({ ...config, about: { ...config.about, enabled: true, title: e.target.value, content: config.about?.content || "" } })}
                    placeholder="e.g. About Asha Rao"
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Your Story & Philosophy</label>
                  <textarea
                    rows={6}
                    value={config.about?.content || ""}
                    onChange={(e) => setConfig({ ...config, about: { ...config.about, enabled: true, title: config.about?.title || "About Me", content: e.target.value } })}
                    placeholder="Describe your career journey, experience, and why you created these resources..."
                    className="input"
                  />
                  <p className="hint">Separate paragraphs with double enter.</p>
                </div>

                <div>
                  <label className="label">Credential Pills (comma-separated)</label>
                  <input
                    type="text"
                    value={(config.about?.credentials || []).join(", ")}
                    onChange={(e) => {
                      const list = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                      setConfig({ ...config, about: { ...config.about, enabled: true, title: config.about?.title || "About Me", content: config.about?.content || "", credentials: list } });
                    }}
                    placeholder="e.g. FCA Chartered Accountant, 12,000+ Students, Featured in Mint"
                    className="input"
                  />
                </div>
              </div>

              {/* Stats Counters */}
              <div className="card space-y-4 p-6">
                <h2 className="text-base font-bold text-ink">Key Highlight Stat Counters (Up to 4)</h2>
                <p className="text-xs text-muted">Concrete numbers build instant credibility with buyers.</p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {(config.stats || [
                    { label: "Learners", value: "10k+", sub: "Trained" },
                    { label: "Rating", value: "4.9★", sub: "Reviews" },
                    { label: "Instant Access", value: "100%", sub: "Guaranteed" },
                    { label: "GST Invoice", value: "Compliant", sub: "For tax claims" },
                  ]).slice(0, 4).map((stat, idx) => (
                    <div key={idx} className="rounded-xl border border-line p-3 space-y-2 bg-surface-2/40">
                      <input
                        type="text"
                        value={stat.label}
                        onChange={(e) => updateStat(idx, { label: e.target.value })}
                        placeholder="Label (e.g. Learners Trained)"
                        className="input text-xs font-semibold"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={stat.value}
                          onChange={(e) => updateStat(idx, { value: e.target.value })}
                          placeholder="Value (12,400+)"
                          className="input text-xs"
                        />
                        <input
                          type="text"
                          value={stat.sub || ""}
                          onChange={(e) => updateStat(idx, { sub: e.target.value })}
                          placeholder="Subtext (e.g. in 2026)"
                          className="input text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Pictures & Gallery */}
          {activeTab === "pictures" && (
            <div className="card space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-ink">Pictures & Visual Showcase Gallery</h2>
                  <p className="text-xs text-muted">Add photos from workshops, speaking keynotes, press features, or cheat sheets.</p>
                </div>
                <button type="button" onClick={addGalleryItem} className="btn btn-secondary btn-sm">
                  + Add Picture Card
                </button>
              </div>

              {(!config.gallery || config.gallery.length === 0) ? (
                <p className="text-xs text-muted italic">No pictures added yet. Click &ldquo;+ Add Picture Card&rdquo; to add your first photo.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {config.gallery.map((item) => (
                    <div key={item.id} className="rounded-xl border border-line p-3 space-y-2 bg-surface-2/40">
                      <div className="relative aspect-16/10 w-full overflow-hidden rounded-lg bg-surface-2">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80";
                          }}
                        />
                      </div>

                      <input
                        type="url"
                        value={item.imageUrl}
                        onChange={(e) => updateGalleryItem(item.id, { imageUrl: e.target.value })}
                        placeholder="Image URL (https://...)"
                        className="input text-xs"
                      />

                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateGalleryItem(item.id, { title: e.target.value })}
                          placeholder="Title"
                          className="input text-xs font-semibold col-span-2"
                        />
                        <input
                          type="text"
                          value={item.tag || ""}
                          onChange={(e) => updateGalleryItem(item.id, { tag: e.target.value })}
                          placeholder="Tag (e.g. Event)"
                          className="input text-xs"
                        />
                      </div>

                      <textarea
                        rows={2}
                        value={item.caption || ""}
                        onChange={(e) => updateGalleryItem(item.id, { caption: e.target.value })}
                        placeholder="Caption / description..."
                        className="input text-xs"
                      />

                      <div className="flex items-center justify-between pt-1">
                        <input
                          type="url"
                          value={item.link || ""}
                          onChange={(e) => updateGalleryItem(item.id, { link: e.target.value })}
                          placeholder="Optional link (https://...)"
                          className="input text-xs flex-1 mr-2"
                        />
                        <button
                          type="button"
                          onClick={() => removeGalleryItem(item.id)}
                          className="btn btn-danger btn-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Testimonials & FAQs */}
          {activeTab === "proof" && (
            <div className="space-y-6">
              {/* Testimonials */}
              <div className="card space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-ink">Student Testimonials & Reviews</h2>
                    <p className="text-xs text-muted">Feature verified feedback, star ratings, and student outcomes.</p>
                  </div>
                  <button type="button" onClick={addTestimonial} className="btn btn-secondary btn-sm">
                    + Add Testimonial
                  </button>
                </div>

                {(!config.testimonials || config.testimonials.length === 0) ? (
                  <p className="text-xs text-muted italic">No testimonials added yet. Click &ldquo;+ Add Testimonial&rdquo; to add one.</p>
                ) : (
                  <div className="space-y-3">
                    {config.testimonials.map((t) => (
                      <div key={t.id} className="rounded-xl border border-line p-4 space-y-3 bg-surface-2/40">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <input
                            type="text"
                            value={t.name}
                            onChange={(e) => updateTestimonial(t.id, { name: e.target.value })}
                            placeholder="Student Name"
                            className="input text-xs font-semibold"
                          />
                          <input
                            type="text"
                            value={t.role || ""}
                            onChange={(e) => updateTestimonial(t.id, { role: e.target.value })}
                            placeholder="Role (e.g. Senior SWE)"
                            className="input text-xs"
                          />
                          <input
                            type="text"
                            value={t.company || ""}
                            onChange={(e) => updateTestimonial(t.id, { company: e.target.value })}
                            placeholder="Company (e.g. Google India)"
                            className="input text-xs"
                          />
                        </div>

                        <textarea
                          rows={2}
                          value={t.quote}
                          onChange={(e) => updateTestimonial(t.id, { quote: e.target.value })}
                          placeholder="Student review quote..."
                          className="input text-xs"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1 font-medium text-ink">
                              <span>Stars:</span>
                              <select
                                value={t.rating}
                                onChange={(e) => updateTestimonial(t.id, { rating: Number(e.target.value) })}
                                className="rounded border border-line bg-surface px-2 py-0.5"
                              >
                                {[5, 4, 3, 2, 1].map((n) => (
                                  <option key={n} value={n}>{n} Stars</option>
                                ))}
                              </select>
                            </label>

                            <input
                              type="text"
                              value={t.highlight || ""}
                              onChange={(e) => updateTestimonial(t.id, { highlight: e.target.value })}
                              placeholder="Outcome pill (e.g. Saved ₹1.4L)"
                              className="input text-xs w-44"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeTestimonial(t.id)}
                            className="btn btn-danger btn-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FAQs */}
              <div className="card space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-ink">Frequently Asked Questions (FAQ)</h2>
                    <p className="text-xs text-muted">Answer common questions to boost buyer confidence.</p>
                  </div>
                  <button type="button" onClick={addFaq} className="btn btn-secondary btn-sm">
                    + Add FAQ
                  </button>
                </div>

                {(!config.faqs || config.faqs.length === 0) ? (
                  <p className="text-xs text-muted italic">No FAQs added yet. Click &ldquo;+ Add FAQ&rdquo; to add questions.</p>
                ) : (
                  <div className="space-y-3">
                    {config.faqs.map((faq) => (
                      <div key={faq.id} className="rounded-xl border border-line p-3 space-y-2 bg-surface-2/40">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={faq.question}
                            onChange={(e) => updateFaq(faq.id, { question: e.target.value })}
                            placeholder="Question"
                            className="input text-xs font-semibold flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => removeFaq(faq.id)}
                            className="btn btn-danger btn-sm"
                          >
                            Delete
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={faq.answer}
                          onChange={(e) => updateFaq(faq.id, { answer: e.target.value })}
                          placeholder="Answer..."
                          className="input text-xs"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: Announcements & Newsletter */}
          {activeTab === "announcements" && (
            <div className="space-y-6">
              {/* Announcement Bar */}
              <div className="card space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-ink">Top Announcement Marquee Banner</h2>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-ink">
                    <input
                      type="checkbox"
                      checked={config.announcement?.enabled || false}
                      onChange={(e) => setConfig({ ...config, announcement: { ...config.announcement, enabled: e.target.checked, text: config.announcement?.text || "" } })}
                      className="h-4 w-4 rounded accent-brand"
                    />
                    <span>Banner Active</span>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="label">Badge Pill Text</label>
                    <input
                      type="text"
                      value={config.announcement?.badge || ""}
                      onChange={(e) => setConfig({ ...config, announcement: { ...config.announcement, enabled: true, text: config.announcement?.text || "", badge: e.target.value.toUpperCase() } })}
                      placeholder="e.g. TAX SEASON 2026"
                      className="input text-xs uppercase"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Announcement Text</label>
                    <input
                      type="text"
                      value={config.announcement?.text || ""}
                      onChange={(e) => setConfig({ ...config, announcement: { ...config.announcement, enabled: true, text: e.target.value } })}
                      placeholder="e.g. New Section 115BAC calculator updated for FY 2026-27"
                      className="input text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Link URL (Optional)</label>
                  <input
                    type="text"
                    value={config.announcement?.link || ""}
                    onChange={(e) => setConfig({ ...config, announcement: { ...config.announcement, enabled: true, text: config.announcement?.text || "", link: e.target.value } })}
                    placeholder="e.g. /c/asha-rao/tax-saving-checklist"
                    className="input text-xs"
                  />
                </div>
              </div>

              {/* Newsletter / Freebie */}
              <div className="card space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-ink">Freebie / Newsletter Lead Capture Box</h2>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-ink">
                    <input
                      type="checkbox"
                      checked={config.newsletter?.enabled !== false}
                      onChange={(e) => setConfig({ ...config, newsletter: { ...config.newsletter, enabled: e.target.checked, title: config.newsletter?.title || "Get Weekly Insights", subtitle: config.newsletter?.subtitle || "", buttonText: config.newsletter?.buttonText || "Subscribe Free" } })}
                      className="h-4 w-4 rounded accent-brand"
                    />
                    <span>Capture Box Active</span>
                  </label>
                </div>

                <div>
                  <label className="label">Heading</label>
                  <input
                    type="text"
                    value={config.newsletter?.title || ""}
                    onChange={(e) => setConfig({ ...config, newsletter: { ...config.newsletter, enabled: true, title: e.target.value, subtitle: config.newsletter?.subtitle || "", buttonText: config.newsletter?.buttonText || "Subscribe Free" } })}
                    placeholder="e.g. Get The Weekly Wealth Dispatch"
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="label">Subtitle / Promise</label>
                  <input
                    type="text"
                    value={config.newsletter?.subtitle || ""}
                    onChange={(e) => setConfig({ ...config, newsletter: { ...config.newsletter, enabled: true, title: config.newsletter?.title || "Newsletter", subtitle: e.target.value, buttonText: config.newsletter?.buttonText || "Subscribe Free" } })}
                    placeholder="e.g. Every Sunday: 1 tax reduction framework and 1 SIP framework."
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="label">Button Text</label>
                  <input
                    type="text"
                    value={config.newsletter?.buttonText || ""}
                    onChange={(e) => setConfig({ ...config, newsletter: { ...config.newsletter, enabled: true, title: config.newsletter?.title || "Newsletter", subtitle: config.newsletter?.subtitle || "", buttonText: e.target.value } })}
                    placeholder="Subscribe Free"
                    className="input text-xs w-48"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Preview Panel */}
        {showPreview && (
          <div className="lg:col-span-6 sticky top-24 self-start">
            <div className="card overflow-hidden shadow-lg border-2 border-brand/20">
              <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-2 text-xs">
                <span className="font-bold text-ink">Live Storefront Preview</span>
                <span className="text-[10px] text-muted">Updates in real time</span>
              </div>

              <div className="max-h-[800px] overflow-y-auto">
                <BrandScope color={brandColor}>
                  <div className="scale-90 origin-top text-xs">
                    <AnnouncementBar announcement={config.announcement} />
                    <StorefrontHero
                      creator={{
                        displayName,
                        handle: creator.handle,
                        bio,
                        brandColor,
                        productsCount: creator.products.length,
                        channelsCount: creator.channelsCount,
                      }}
                      config={config}
                    />
                    <QuickLinksSection links={config.customLinks} />
                    <ProductsSection products={creator.products} creatorHandle={creator.handle} />
                    <AboutSection about={config.about} stats={config.stats} creatorName={displayName} />
                    <MediaGallerySection items={config.gallery} />
                    <TestimonialsSection testimonials={config.testimonials} />
                    <FaqSection faqs={config.faqs} />
                    <NewsletterSection newsletter={config.newsletter} />
                    <StorefrontFooter creatorName={displayName} />
                  </div>
                </BrandScope>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
