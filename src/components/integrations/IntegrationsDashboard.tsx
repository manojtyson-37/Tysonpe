"use client";

import { useState, useTransition } from "react";
import type {
  CreatorIntegrationsConfig,
  CreatorWebhookEndpoint,
  LiveClassConfig,
  TelegramConfig,
  TrackingPixelsConfig,
  WebhookEventName,
} from "@/lib/integrations/types";
import {
  addWebhookEndpointAction,
  deleteWebhookEndpointAction,
  toggleWebhookEndpointAction,
  testWebhookAction,
  saveTrackingPixelsAction,
  saveLiveClassAction,
  saveTelegramAction,
} from "@/app/actions/integrations";

interface IntegrationsDashboardProps {
  initialConfig: CreatorIntegrationsConfig;
  creatorHandle: string;
}

const AVAILABLE_EVENTS: { id: WebhookEventName; label: string; desc: string }[] = [
  { id: "order.paid", label: "order.paid", desc: "Triggered whenever an order is successfully paid via UPI, Razorpay, or Easebuzz." },
  { id: "lead.created", label: "lead.created", desc: "Triggered when a new prospect is captured via storefront inquiry or CRM." },
  { id: "enrollment.created", label: "enrollment.created", desc: "Triggered when learner access is granted to a product." },
  { id: "course.completed", label: "course.completed", desc: "Triggered when a learner completes 100% of curriculum lessons." },
  { id: "order.refunded", label: "order.refunded", desc: "Triggered when an order refund is processed." },
];

export function IntegrationsDashboard({
  initialConfig,
  creatorHandle,
}: IntegrationsDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "webhooks" | "tracking" | "liveClass" | "email" | "telegram"
  >("webhooks");
  const [config, setConfig] = useState<CreatorIntegrationsConfig>(initialConfig);
  const [isPending, startTransition] = useTransition();
  const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Add Webhook Form State
  const [showAddWebhookModal, setShowAddWebhookModal] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookSecret, setNewWebhookSecret] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventName[]>(["order.paid"]);

  // Test Webhook State
  const [testingHookId, setTestingHookId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    hookId: string;
    statusCode?: number;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  // Tracking Pixels Form State
  const [trackingForm, setTrackingForm] = useState<TrackingPixelsConfig>(config.tracking);

  // Live Class Form State
  const [liveClassForm, setLiveClassForm] = useState<LiveClassConfig>(config.liveClass);

  // Telegram Form State
  const [telegramForm, setTelegramForm] = useState<TelegramConfig>(config.telegram);

  const showToast = (text: string, ok = true) => {
    setToastMsg({ text, ok });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleToggleEvent = (event: WebhookEventName) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const handleAddWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookUrl.trim()) return;

    startTransition(async () => {
      const res = await addWebhookEndpointAction({
        url: newWebhookUrl,
        secret: newWebhookSecret || undefined,
        events: selectedEvents,
      });

      if (res.ok && res.webhook) {
        setConfig((prev) => ({
          ...prev,
          webhooks: [res.webhook!, ...prev.webhooks],
        }));
        setShowAddWebhookModal(false);
        setNewWebhookUrl("");
        setNewWebhookSecret("");
        setSelectedEvents(["order.paid"]);
        showToast("Webhook endpoint added successfully!");
      } else {
        showToast(res.error || "Failed to add webhook", false);
      }
    });
  };

  const handleDeleteWebhook = (id: string) => {
    if (!confirm("Are you sure you want to delete this webhook endpoint?")) return;
    startTransition(async () => {
      const res = await deleteWebhookEndpointAction(id);
      if (res.ok) {
        setConfig((prev) => ({
          ...prev,
          webhooks: prev.webhooks.filter((h) => h.id !== id),
        }));
        showToast("Webhook endpoint deleted");
      } else {
        showToast(res.error || "Failed to delete webhook", false);
      }
    });
  };

  const handleToggleWebhook = (id: string, currentEnabled: boolean) => {
    const nextEnabled = !currentEnabled;
    setConfig((prev) => ({
      ...prev,
      webhooks: prev.webhooks.map((h) => (h.id === id ? { ...h, enabled: nextEnabled } : h)),
    }));

    startTransition(async () => {
      const res = await toggleWebhookEndpointAction(id, nextEnabled);
      if (!res.ok) {
        showToast("Failed to update status", false);
      } else {
        showToast(nextEnabled ? "Webhook enabled" : "Webhook paused");
      }
    });
  };

  const handleTestWebhook = (hook: CreatorWebhookEndpoint) => {
    setTestingHookId(hook.id);
    setTestResult(null);

    startTransition(async () => {
      const res = await testWebhookAction({
        url: hook.url,
        secret: hook.secret,
        event: hook.events[0] || "order.paid",
      });

      setTestingHookId(null);
      setTestResult({
        hookId: hook.id,
        statusCode: res.statusCode,
        latencyMs: res.latencyMs,
        error: res.error,
      });

      if (res.ok) {
        showToast(`Test payload delivered in ${res.latencyMs}ms (HTTP ${res.statusCode})`);
      } else {
        showToast(res.error || "Webhook test failed", false);
      }
    });
  };

  const handleSaveTracking = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveTrackingPixelsAction(trackingForm);
      if (res.ok) {
        setConfig((prev) => ({ ...prev, tracking: trackingForm }));
        showToast("Tracking pixels saved! Changes are now active on your store.");
      } else {
        showToast(res.error || "Failed to save tracking pixels", false);
      }
    });
  };

  const handleSaveLiveClass = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveLiveClassAction(liveClassForm);
      if (res.ok) {
        setConfig((prev) => ({ ...prev, liveClass: liveClassForm }));
        showToast("Live class defaults saved!");
      } else {
        showToast(res.error || "Failed to save live class settings", false);
      }
    });
  };

  const handleSaveTelegram = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveTelegramAction(telegramForm);
      if (res.ok) {
        setConfig((prev) => ({ ...prev, telegram: telegramForm }));
        showToast("Telegram community settings saved!");
      } else {
        showToast(res.error || "Failed to save telegram settings", false);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 ${
            toastMsg.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${toastMsg.ok ? "bg-emerald-500" : "bg-red-500"}`} />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              Integrations & APIs
            </h1>
            <span className="badge badge-brand text-[10px] font-bold uppercase tracking-wider">
              Zapier & Webhooks Ready
            </span>
          </div>
          <p className="mt-1 text-xs text-muted sm:text-sm">
            Connect external tools, ad tracking pixels, live webinars, and automated workflow triggers for @{creatorHandle}.
          </p>
        </div>

        {activeTab === "webhooks" && (
          <button
            onClick={() => setShowAddWebhookModal(true)}
            className="btn btn-primary btn-sm self-start sm:self-auto"
          >
            <span>+ Add Webhook Endpoint</span>
          </button>
        )}
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex border-b border-line overflow-x-auto">
        <div className="flex gap-2">
          {[
            { id: "webhooks", label: "Webhooks (Zapier & Make)", count: config.webhooks.length },
            { id: "tracking", label: "Meta Pixel & GA4 Tracking" },
            { id: "liveClass", label: "Live Webinars (Zoom / Meet)" },
            { id: "telegram", label: "Telegram Community" },
            { id: "email", label: "Email Marketing (Coming Soon)" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`whitespace-nowrap px-4 py-2.5 text-xs font-semibold transition-all duration-150 border-b-2 -mb-px active:scale-[0.98] ${
                activeTab === t.id
                  ? "border-brand text-brand font-bold"
                  : "border-transparent text-muted hover:text-ink hover:border-line"
              }`}
            >
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-muted">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: WEBHOOKS & ZAPIER */}
      {activeTab === "webhooks" && (
        <div className="space-y-6">
          {/* Quick Connect Banner for Zapier / Pabbly */}
          <div className="card p-5 border-brand/30 bg-brand-soft/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-bold text-ink">Connect with 5,000+ Apps via Webhooks</p>
              <p className="text-xs text-muted">
                Send realtime data to Zapier, Make.com, Pabbly Connect, Google Sheets, or your custom CRM server whenever customers buy.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-brand text-[10px]">HMAC-SHA256 Signed</span>
              <span className="badge badge-good text-[10px]">Instant Dispatch</span>
            </div>
          </div>

          {/* Webhooks List */}
          {config.webhooks.length === 0 ? (
            <div className="card p-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-brand">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-ink">No Webhooks Configured Yet</h3>
              <p className="text-xs text-muted max-w-md mx-auto">
                Add an endpoint to start streaming order confirmations, customer leads, and course completions to your automation pipelines.
              </p>
              <button
                onClick={() => setShowAddWebhookModal(true)}
                className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
              >
                <span>+ Create Your First Webhook</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {config.webhooks.map((hook) => (
                <div key={hook.id} className="card p-5 space-y-4 transition-all hover:border-brand/40">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            hook.enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                          }`}
                        />
                        <code className="text-sm font-bold text-ink break-all font-mono">
                          {hook.url}
                        </code>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {hook.events.map((ev) => (
                          <span key={ev} className="badge badge-brand text-[10px]">
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleTestWebhook(hook)}
                        disabled={testingHookId === hook.id}
                        className="btn btn-secondary btn-sm text-xs"
                      >
                        {testingHookId === hook.id ? (
                          <span className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                            <span>Firing test...</span>
                          </span>
                        ) : (
                          <span>⚡ Test Webhook</span>
                        )}
                      </button>

                      <button
                        onClick={() => handleToggleWebhook(hook.id, hook.enabled)}
                        className={`btn btn-sm text-xs ${
                          hook.enabled ? "btn-secondary text-muted" : "btn-primary"
                        }`}
                      >
                        {hook.enabled ? "Pause" : "Enable"}
                      </button>

                      <button
                        onClick={() => handleDeleteWebhook(hook.id)}
                        className="btn btn-sm text-bad hover:bg-bad-soft text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Secret Token & Status */}
                  <div className="flex flex-wrap items-center justify-between border-t border-line/60 pt-3 text-xs text-muted">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider">Secret:</span>
                      <code className="font-mono text-[11px] bg-surface-2 px-2 py-0.5 rounded text-ink">
                        {hook.secret ? `${hook.secret.slice(0, 8)}••••••••` : "None"}
                      </code>
                    </div>

                    <div className="flex items-center gap-3 text-[11px]">
                      {hook.lastFiredAt && (
                        <span>
                          Last fired: {new Date(hook.lastFiredAt).toLocaleTimeString()}
                        </span>
                      )}
                      {hook.lastStatus !== undefined && (
                        <span
                          className={`badge ${
                            hook.lastStatus >= 200 && hook.lastStatus < 300
                              ? "badge-good"
                              : "badge-bad"
                          }`}
                        >
                          HTTP {hook.lastStatus}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Live Test Result Banner */}
                  {testResult && testResult.hookId === hook.id && (
                    <div
                      className={`p-3 rounded-xl border text-xs ${
                        testResult.statusCode && testResult.statusCode >= 200 && testResult.statusCode < 300
                          ? "bg-good-soft/60 border-good/30 text-good"
                          : "bg-bad-soft border-bad/30 text-bad"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">
                          {testResult.statusCode && testResult.statusCode >= 200 && testResult.statusCode < 300
                            ? `✓ Successfully delivered test payload (HTTP ${testResult.statusCode})`
                            : `✕ Delivery failed (HTTP ${testResult.statusCode || 0})`}
                        </span>
                        {testResult.latencyMs && <span>Latency: {testResult.latencyMs}ms</span>}
                      </div>
                      {testResult.error && (
                        <p className="mt-1 text-[11px] opacity-90">{testResult.error}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: META PIXEL & GA4 TRACKING */}
      {activeTab === "tracking" && (
        <div className="card max-w-2xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-ink">Marketing & Ad Conversion Pixels</h2>
            <p className="text-xs text-muted mt-0.5">
              Automatically track Page Views, Add to Cart, Initiate Checkout, and Paid Purchases on your creator storefront.
            </p>
          </div>

          <form onSubmit={handleSaveTracking} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Meta Pixel ID (Facebook Pixel)
              </label>
              <input
                type="text"
                placeholder="e.g. 123456789012345"
                value={trackingForm.metaPixelId || ""}
                onChange={(e) =>
                  setTrackingForm((prev) => ({ ...prev, metaPixelId: e.target.value }))
                }
                className="w-full rounded-xl border border-line bg-bg p-3 text-xs font-mono text-ink placeholder:text-muted/60"
              />
              <p className="mt-1 text-[11px] text-muted">
                Fires <code>fbq(&apos;track&apos;, &apos;Purchase&apos;, &#123; value, currency: &apos;INR&apos; &#125;)</code> on completed payments for Meta Ad ROAS optimization.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Google Analytics 4 Measurement ID
              </label>
              <input
                type="text"
                placeholder="e.g. G-XXXXXXXXXX"
                value={trackingForm.googleAnalyticsId || ""}
                onChange={(e) =>
                  setTrackingForm((prev) => ({ ...prev, googleAnalyticsId: e.target.value }))
                }
                className="w-full rounded-xl border border-line bg-bg p-3 text-xs font-mono text-ink placeholder:text-muted/60"
              />
              <p className="mt-1 text-[11px] text-muted">
                Automatically tracks ecommerce funnel and revenue metrics inside Google Analytics.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Google Tag Manager (GTM Container ID)
              </label>
              <input
                type="text"
                placeholder="e.g. GTM-XXXXXX"
                value={trackingForm.gtmContainerId || ""}
                onChange={(e) =>
                  setTrackingForm((prev) => ({ ...prev, gtmContainerId: e.target.value }))
                }
                className="w-full rounded-xl border border-line bg-bg p-3 text-xs font-mono text-ink placeholder:text-muted/60"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary btn-md"
            >
              {isPending ? "Saving changes..." : "Save Tracking Settings"}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: LIVE WEBINARS & CLASSES */}
      {activeTab === "liveClass" && (
        <div className="card max-w-2xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-ink">Live Webinars & Cohort Setup</h2>
            <p className="text-xs text-muted mt-0.5">
              Configure your default meeting platform for webinar products and 1:1 consultation bookings.
            </p>
          </div>

          <form onSubmit={handleSaveLiveClass} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Default Meeting Provider
              </label>
              <select
                value={liveClassForm.defaultProvider}
                onChange={(e) =>
                  setLiveClassForm((prev) => ({
                    ...prev,
                    defaultProvider: e.target.value as LiveClassConfig["defaultProvider"],
                  }))
                }
                className="w-full rounded-xl border border-line bg-bg p-3 text-xs text-ink font-semibold"
              >
                <option value="zoom">Zoom Video Communications</option>
                <option value="google_meet">Google Meet</option>
                <option value="youtube_live">YouTube Live (Unlisted Stream)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Personal Meeting URL / Zoom Room Link
              </label>
              <input
                type="url"
                placeholder="https://zoom.us/j/1234567890 or https://meet.google.com/abc-defg-hij"
                value={liveClassForm.meetingUrl || ""}
                onChange={(e) =>
                  setLiveClassForm((prev) => ({ ...prev, meetingUrl: e.target.value }))
                }
                className="w-full rounded-xl border border-line bg-bg p-3 text-xs font-mono text-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Passcode / Access Key (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 123456"
                value={liveClassForm.meetingPassword || ""}
                onChange={(e) =>
                  setLiveClassForm((prev) => ({ ...prev, meetingPassword: e.target.value }))
                }
                className="w-full rounded-xl border border-line bg-bg p-3 text-xs font-mono text-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Instructions for Attendees
              </label>
              <textarea
                rows={3}
                value={liveClassForm.instructions || ""}
                onChange={(e) =>
                  setLiveClassForm((prev) => ({ ...prev, instructions: e.target.value }))
                }
                className="w-full rounded-xl border border-line bg-bg p-3 text-xs text-ink"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary btn-md"
            >
              {isPending ? "Saving..." : "Save Live Webinar Defaults"}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: TELEGRAM COMMUNITY */}
      {activeTab === "telegram" && (
        <div className="card max-w-2xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-ink">Telegram VIP Group Automation</h2>
            <p className="text-xs text-muted mt-0.5">
              Deliver an exclusive Telegram invite link to verified paying students right after checkout.
            </p>
          </div>

          <form onSubmit={handleSaveTelegram} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Private Telegram Channel / Group Invite Link
              </label>
              <input
                type="url"
                placeholder="https://t.me/+AbCdEfGhIjKlMnOp"
                value={telegramForm.channelUrl || ""}
                onChange={(e) =>
                  setTelegramForm((prev) => ({ ...prev, channelUrl: e.target.value }))
                }
                className="w-full rounded-xl border border-line bg-bg p-3 text-xs font-mono text-ink"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="autoInvite"
                checked={telegramForm.autoInviteOnPurchase}
                onChange={(e) =>
                  setTelegramForm((prev) => ({
                    ...prev,
                    autoInviteOnPurchase: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
              />
              <label htmlFor="autoInvite" className="text-xs font-semibold text-ink cursor-pointer">
                Automatically display Telegram link on order success page and WhatsApp order update
              </label>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary btn-md"
            >
              {isPending ? "Saving..." : "Save Telegram Settings"}
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: EMAIL MARKETING */}
      {activeTab === "email" && (
        <div className="card max-w-2xl p-8 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-ink">Direct Email Sync Coming Soon</h3>
          <p className="text-xs text-muted max-w-md mx-auto">
            You can already sync customer emails and leads to Mailchimp, ConvertKit, and ActiveCampaign right now using the <strong>Webhooks (Zapier)</strong> tab above!
          </p>
        </div>
      )}

      {/* ADD WEBHOOK MODAL */}
      {showAddWebhookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink font-display">
                Add Outgoing Webhook Endpoint
              </h3>
              <button
                onClick={() => setShowAddWebhookModal(false)}
                className="text-muted hover:text-ink text-sm px-2 py-1 rounded-lg hover:bg-surface-2 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWebhook} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Destination Webhook URL (HTTPS)
                </label>
                <input
                  type="url"
                  placeholder="https://hooks.zapier.com/hooks/catch/... or https://yourdomain.com/webhook"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  className="w-full rounded-xl border border-line bg-bg p-3 text-xs font-mono text-ink"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  HMAC Secret Key (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave blank to auto-generate a secure random secret"
                  value={newWebhookSecret}
                  onChange={(e) => setNewWebhookSecret(e.target.value)}
                  className="w-full rounded-xl border border-line bg-bg p-3 text-xs font-mono text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-2">
                  Subscribe to Events:
                </label>
                <div className="space-y-2">
                  {AVAILABLE_EVENTS.map((ev) => {
                    const checked = selectedEvents.includes(ev.id);
                    return (
                      <label
                        key={ev.id}
                        className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          checked
                            ? "border-brand bg-brand-soft/20 text-ink"
                            : "border-line bg-surface text-muted hover:border-line/80"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleEvent(ev.id)}
                          className="mt-0.5 h-4 w-4 rounded border-line text-brand focus:ring-brand"
                        />
                        <div className="text-xs">
                          <p className="font-bold text-ink font-mono">{ev.label}</p>
                          <p className="text-[11px] text-muted mt-0.5">{ev.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowAddWebhookModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !newWebhookUrl || selectedEvents.length === 0}
                  className="btn btn-primary btn-sm"
                >
                  {isPending ? "Saving..." : "Create Webhook"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
