"use client";

import { useState, useTransition, useMemo } from "react";
import type {
  CreatorIntegrationsConfig,
  CreatorWebhookEndpoint,
  LiveClassConfig,
  TelegramConfig,
  TrackingPixelsConfig,
  GoogleSheetsConfig,
  DiscordConfig,
  SmsConfig,
  EmailMarketingConfig,
  CustomDomainConfig,
  InboundWebhookEndpoint,
  InboundWebhookLog,
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
  saveGoogleSheetsAction,
  testGoogleSheetsSyncAction,
  saveDiscordAction,
  testDiscordWebhookAction,
  saveSmsAction,
  testSendSmsAction,
  saveEmailMarketingAction,
  testEmailMarketingAction,
  saveCustomDomainAction,
  verifyCustomDomainAction,
} from "@/app/actions/integrations";
import {
  generateInboundEndpointAction,
  toggleInboundEndpointAction,
  deleteInboundEndpointAction,
  testInboundWebhookAction,
} from "@/app/actions/inbound-webhooks";
import {
  GoogleSheetsIcon,
  DiscordIcon,
  SmsIcon,
  EmailMarketingIcon,
  MetaPixelIcon,
  CustomDomainIcon,
  ZoomMeetingIcon,
  TelegramChannelIcon,
  WebhookApiIcon,
  InboundWebhookIcon,
} from "@/components/gateway-icons";

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

type AppCategory = "all" | "automation" | "community" | "marketing" | "storefront";

type ModalAppId =
  | null
  | "sheets"
  | "discord"
  | "sms"
  | "email"
  | "domain"
  | "pixels"
  | "webhooks"
  | "zoom"
  | "telegram"
  | "inbound";

export function IntegrationsDashboard({
  initialConfig,
  creatorHandle,
}: IntegrationsDashboardProps) {
  const [config, setConfig] = useState<CreatorIntegrationsConfig>(initialConfig);
  const [selectedCategory, setSelectedCategory] = useState<AppCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeModal, setActiveModal] = useState<ModalAppId>(null);
  const [modalTab, setModalTab] = useState<"settings" | "test" | "logs">("settings");

  const [isPending, startTransition] = useTransition();
  const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Form states
  const [sheetsForm, setSheetsForm] = useState<GoogleSheetsConfig>(config.googleSheets || {
    spreadsheetId: "",
    sheetName: "Tysonpe Orders",
    syncOnOrder: true,
    syncOnLead: true,
    enabled: false,
  });
  const [discordForm, setDiscordForm] = useState<DiscordConfig>(config.discord || {
    webhookUrl: "",
    serverInviteUrl: "",
    botEnabled: false,
    autoNotifyOnPurchase: true,
  });
  const [smsForm, setSmsForm] = useState<SmsConfig>(config.sms || {
    provider: "fast2sms",
    senderId: "TYSONP",
    apiKey: "",
    sendOtp: true,
    sendOrderConfirmation: true,
    enabled: false,
  });
  const [emailForm, setEmailForm] = useState<EmailMarketingConfig>(config.emailMarketing || {
    provider: "none",
    apiKey: "",
    audienceId: "",
    tag: "Tysonpe Customer",
    autoSyncLearners: false,
  });
  const [domainForm, setDomainForm] = useState<CustomDomainConfig>(config.customDomain || {
    domain: "",
    verified: false,
    sslActive: false,
  });
  const [trackingForm, setTrackingForm] = useState<TrackingPixelsConfig>(config.tracking);
  const [liveClassForm, setLiveClassForm] = useState<LiveClassConfig>(config.liveClass);
  const [telegramForm, setTelegramForm] = useState<TelegramConfig>(config.telegram);

  // Inbound Webhooks State
  const [showAddInbound, setShowAddInbound] = useState(false);
  const [newInboundName, setNewInboundName] = useState("Jodo / Institutional Gateway");
  const [newInboundPartner, setNewInboundPartner] = useState<"jodo" | "generic" | "custom">("jodo");
  const [newInboundSecret, setNewInboundSecret] = useState("");
  const [selectedInboundEndpointId, setSelectedInboundEndpointId] = useState<string>("");

  const DEFAULT_SAMPLE_PAYLOAD = JSON.stringify(
    {
      event_id: "45bb1387-2a83-4fdb-a149-e7dec81043f0",
      event: "order.payment.debited",
      version: "1.0",
      timestamp: 1691143279,
      payload: {
        order_id: "order_12343532424",
        order: {
          name: "Ron Rivest",
          phone: "9876543210",
          identifier: "STUDENT_IDENTIFIER",
          email: "customer@example.com",
          paid_at: "2023-04-05T07:07:20Z",
          status: "paid",
          details: [
            {
              component_type: "Admission Fee",
              amount: 10000.0,
            },
          ],
          notes: [
            {
              key: "erp_reference_id",
              value: "REF123",
            },
          ],
        },
      },
    },
    null,
    2
  );

  const [inboundPayloadText, setInboundPayloadText] = useState(DEFAULT_SAMPLE_PAYLOAD);
  const [inboundTestResult, setInboundTestResult] = useState<{
    ok: boolean;
    latencyMs?: number;
    orderId?: string;
    invoiceNo?: string;
    amountPaise?: number;
    customerName?: string;
    customerEmail?: string;
    alreadyProcessed?: boolean;
    error?: string;
  } | null>(null);
  const [selectedLogForInspect, setSelectedLogForInspect] = useState<InboundWebhookLog | null>(null);

  // Outbound Webhooks management state
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookSecret, setNewWebhookSecret] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventName[]>(["order.paid"]);

  // Test simulation states
  const [testLoading, setTestLoading] = useState(false);
  const [sheetsTestResult, setSheetsTestResult] = useState<{
    ok: boolean;
    latencyMs?: number;
    rowsAppended?: number;
    sampleRow?: string[];
    error?: string;
  } | null>(null);
  const [discordTestResult, setDiscordTestResult] = useState<{
    ok: boolean;
    statusCode?: number;
    latencyMs?: number;
    previewEmbed?: Record<string, unknown>;
    error?: string;
  } | null>(null);
  const [smsTestResult, setSmsTestResult] = useState<{
    ok: boolean;
    latencyMs?: number;
    messageId?: string;
    previewText?: string;
    error?: string;
  } | null>(null);
  const [emailTestResult, setEmailTestResult] = useState<{
    ok: boolean;
    latencyMs?: number;
    syncedEmail?: string;
    tag?: string;
    error?: string;
  } | null>(null);
  const [domainTestResult, setDomainTestResult] = useState<{
    ok: boolean;
    verified?: boolean;
    sslActive?: boolean;
    latencyMs?: number;
    dnsRecord?: { type: string; host: string; target: string; status: string; ttl: number };
    error?: string;
  } | null>(null);
  const [webhookTestResult, setWebhookTestResult] = useState<{
    hookId: string;
    statusCode?: number;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  const showToast = (text: string, ok = true) => {
    setToastMsg({ text, ok });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Connected count metric
  const connectedCount = useMemo(() => {
    let count = 0;
    if (config.googleSheets?.enabled) count++;
    if (config.discord?.webhookUrl) count++;
    if (config.sms?.enabled) count++;
    if (config.emailMarketing?.provider !== "none" && config.emailMarketing?.apiKey) count++;
    if (config.customDomain?.verified) count++;
    if (config.tracking?.metaPixelId || config.tracking?.googleAnalyticsId) count++;
    if (config.webhooks?.some((h) => h.enabled)) count++;
    if (config.liveClass?.meetingUrl) count++;
    if (config.telegram?.channelUrl) count++;
    if ((config.inboundEndpoints?.length ?? 0) > 0) count++;
    return count;
  }, [config]);

  // Open modal helper
  const openAppModal = (appId: ModalAppId, initialTab: "settings" | "test" | "logs" = "settings") => {
    setActiveModal(appId);
    setModalTab(initialTab);
  };

  // Inbound Webhooks Handlers
  const handleGenerateInboundEndpoint = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await generateInboundEndpointAction({
        name: newInboundName,
        partner: newInboundPartner,
        secret: newInboundSecret || undefined,
      });
      if (res.ok && res.endpoint) {
        setConfig((prev) => ({
          ...prev,
          inboundEndpoints: [res.endpoint!, ...(prev.inboundEndpoints || [])],
        }));
        setShowAddInbound(false);
        setNewInboundName("Jodo / Institutional Gateway");
        setNewInboundSecret("");
        showToast("Inbound webhook endpoint generated!");
      } else {
        showToast(res.error || "Failed to generate endpoint", false);
      }
    });
  };

  const handleAutoProvisionInbound = () => {
    startTransition(async () => {
      const res = await generateInboundEndpointAction({
        name: "Jodo / Institutional Gateway",
        partner: "jodo",
      });
      if (res.ok && res.endpoint) {
        setConfig((prev) => ({
          ...prev,
          inboundEndpoints: [res.endpoint!, ...(prev.inboundEndpoints || [])],
        }));
        showToast("Inbound webhook generated successfully!");
      }
    });
  };

  const handleToggleInboundEndpoint = (id: string, enabled: boolean) => {
    startTransition(async () => {
      const res = await toggleInboundEndpointAction(id, enabled);
      if (res.ok) {
        setConfig((prev) => ({
          ...prev,
          inboundEndpoints: (prev.inboundEndpoints || []).map((ep) =>
            ep.id === id ? { ...ep, enabled } : ep
          ),
        }));
        showToast(`Endpoint ${enabled ? "enabled" : "paused"}`);
      } else {
        showToast(res.error || "Failed to update endpoint", false);
      }
    });
  };

  const handleDeleteInboundEndpoint = (id: string) => {
    if (!confirm("Are you sure you want to delete this inbound webhook endpoint?")) return;
    startTransition(async () => {
      const res = await deleteInboundEndpointAction(id);
      if (res.ok) {
        setConfig((prev) => ({
          ...prev,
          inboundEndpoints: (prev.inboundEndpoints || []).filter((ep) => ep.id !== id),
        }));
        showToast("Endpoint deleted");
      } else {
        showToast(res.error || "Failed to delete endpoint", false);
      }
    });
  };

  const handleTestInboundWebhook = async () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(inboundPayloadText);
    } catch {
      showToast("Invalid JSON syntax. Please correct before testing.", false);
      return;
    }

    const endpointId =
      selectedInboundEndpointId ||
      config.inboundEndpoints?.[0]?.id ||
      `inwh_default_${creatorHandle}`;

    setTestLoading(true);
    setInboundTestResult(null);

    const res = await testInboundWebhookAction({
      endpointId,
      payload: parsed,
    });

    setInboundTestResult(res);
    setTestLoading(false);

    if (res.ok) {
      showToast(`Payment automated! Tax Invoice: ${res.invoiceNo || "Generated"}`);
      // Refresh local logs
      setConfig((prev) => {
        const newLog: InboundWebhookLog = {
          id: `inlog_${Date.now()}`,
          endpointId,
          eventId: String(parsed.event_id || "evt_test"),
          event: String(parsed.event || "order.payment.debited"),
          orderId: res.orderId,
          customerName: res.customerName,
          customerEmail: res.customerEmail,
          amountPaise: res.amountPaise,
          status: "processed",
          statusCode: 200,
          receivedAt: new Date().toISOString(),
          invoiceNo: res.invoiceNo,
          rawPayload: parsed,
        };
        return {
          ...prev,
          inboundLogs: [newLog, ...(prev.inboundLogs || [])].slice(0, 30),
        };
      });
    } else {
      showToast(res.error || "Webhook test failed", false);
    }
  };

  // Outbound & Channel Handlers
  const handleSaveSheets = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveGoogleSheetsAction(sheetsForm);
      if (res.ok) {
        setConfig((prev) => ({ ...prev, googleSheets: sheetsForm }));
        showToast("Google Sheets configuration saved!");
      } else {
        showToast(res.error || "Failed to save Google Sheets config", false);
      }
    });
  };

  const handleTestSheets = async () => {
    setTestLoading(true);
    setSheetsTestResult(null);
    const res = await testGoogleSheetsSyncAction({
      spreadsheetId: sheetsForm.spreadsheetId || "sample-tysonpe-10923849",
      sheetName: sheetsForm.sheetName,
    });
    setSheetsTestResult(res);
    setTestLoading(false);
  };

  const handleSaveDiscord = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveDiscordAction(discordForm);
      if (res.ok) {
        setConfig((prev) => ({ ...prev, discord: discordForm }));
        showToast("Discord configuration saved!");
      } else {
        showToast(res.error || "Failed to save Discord config", false);
      }
    });
  };

  const handleTestDiscord = async () => {
    setTestLoading(true);
    setDiscordTestResult(null);
    const res = await testDiscordWebhookAction({
      webhookUrl: discordForm.webhookUrl || "https://discord.com/api/webhooks/demo",
    });
    setDiscordTestResult(res);
    setTestLoading(false);
  };

  const handleSaveSms = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveSmsAction(smsForm);
      if (res.ok) {
        setConfig((prev) => ({ ...prev, sms: smsForm }));
        showToast("SMS gateway credentials saved!");
      } else {
        showToast(res.error || "Failed to save SMS settings", false);
      }
    });
  };

  const handleTestSms = async () => {
    setTestLoading(true);
    setSmsTestResult(null);
    const res = await testSendSmsAction({
      provider: smsForm.provider,
      senderId: smsForm.senderId || "TYSONP",
      apiKey: smsForm.apiKey || "demo_key",
    });
    setSmsTestResult(res);
    setTestLoading(false);
  };

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveEmailMarketingAction(emailForm);
      if (res.ok) {
        setConfig((prev) => ({ ...prev, emailMarketing: emailForm }));
        showToast("Email marketing settings saved!");
      } else {
        showToast(res.error || "Failed to save email settings", false);
      }
    });
  };

  const handleTestEmail = async () => {
    setTestLoading(true);
    setEmailTestResult(null);
    const res = await testEmailMarketingAction({
      provider: emailForm.provider,
      apiKey: emailForm.apiKey || "demo_key",
      audienceId: emailForm.audienceId || "aud_tysonpe_learners",
      tag: emailForm.tag,
    });
    setEmailTestResult(res);
    setTestLoading(false);
  };

  const handleSaveDomain = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveCustomDomainAction(domainForm);
      if (res.ok) {
        setConfig((prev) => ({ ...prev, customDomain: domainForm }));
        showToast("Custom domain saved!");
      } else {
        showToast(res.error || "Failed to save domain", false);
      }
    });
  };

  const handleVerifyDomain = async () => {
    setTestLoading(true);
    setDomainTestResult(null);
    const res = await verifyCustomDomainAction({
      domain: domainForm.domain || `learn.${creatorHandle}.com`,
    });
    setDomainTestResult(res);
    if (res.ok && res.verified) {
      const updated = { ...domainForm, verified: true, sslActive: true };
      setDomainForm(updated);
      setConfig((prev) => ({ ...prev, customDomain: updated }));
      saveCustomDomainAction(updated);
    }
    setTestLoading(false);
  };

  const handleSaveTracking = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveTrackingPixelsAction(trackingForm);
      if (res.ok) {
        setConfig((prev) => ({ ...prev, tracking: trackingForm }));
        showToast("Tracking pixel IDs saved & deployed to storefront!");
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
        showToast("Live cohort meeting instructions updated!");
      } else {
        showToast(res.error || "Failed to update live class", false);
      }
    });
  };

  const handleSaveTelegram = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveTelegramAction(telegramForm);
      if (res.ok) {
        setConfig((prev) => ({ ...prev, telegram: telegramForm }));
        showToast("Telegram community links saved!");
      } else {
        showToast(res.error || "Failed to save Telegram config", false);
      }
    });
  };

  // Outbound Webhooks CRUD
  const handleAddWebhookSubmit = (e: React.FormEvent) => {
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
        setShowAddWebhook(false);
        setNewWebhookUrl("");
        setNewWebhookSecret("");
        showToast("Webhook endpoint added!");
      } else {
        showToast(res.error || "Failed to add endpoint", false);
      }
    });
  };

  const handleTestWebhookEndpoint = async (hook: CreatorWebhookEndpoint) => {
    setWebhookTestResult(null);
    const res = await testWebhookAction({
      url: hook.url,
      secret: hook.secret,
      event: hook.events[0] || "order.paid",
    });
    setWebhookTestResult({
      hookId: hook.id,
      statusCode: res.statusCode,
      latencyMs: res.latencyMs,
      error: res.error,
    });
  };

  const appDirectory = [
    {
      id: "inbound",
      name: "Inbound Payment Webhooks",
      category: "automation" as AppCategory,
      badge: "Automate Payment Records",
      icon: <InboundWebhookIcon className="w-6 h-6 text-brand" />,
      connected: (config.inboundEndpoints?.length ?? 0) > 0,
      headline: "Consume partner & ERP webhooks to automate payment records",
      description: "Generates unique receiver endpoints to ingest external payment payloads (Jodo, ERPs, gateways), allocate GST tax invoices, and record ledger credits.",
    },
    {
      id: "sheets",
      name: "Google Sheets",
      category: "automation" as AppCategory,
      badge: "Real-time Row Sync",
      icon: <GoogleSheetsIcon className="w-6 h-6" />,
      connected: !!config.googleSheets?.enabled,
      headline: "Stream orders & CRM leads to Google Spreadsheets",
      description: "Auto-appends paid buyers with UPI UTR, customer email, phone, and ₹ price directly into your designated sheet row.",
    },
    {
      id: "discord",
      name: "Discord VIP Bot",
      category: "community" as AppCategory,
      badge: "Webhook & Alerts",
      icon: <DiscordIcon className="w-6 h-6" />,
      connected: !!config.discord?.webhookUrl,
      headline: "Broadcast new purchases to Discord private staff channels",
      description: "Sends branded order notifications with buyer avatars, price breakdown, and instant cohort join links.",
    },
    {
      id: "sms",
      name: "Fast2SMS & MSG91",
      category: "community" as AppCategory,
      badge: "DLT SMS Gateway",
      icon: <SmsIcon className="w-6 h-6 text-brand" />,
      connected: !!config.sms?.enabled,
      headline: "Instant DLT transactional SMS receipts & order OTPs",
      description: "Deliver regulatory-compliant 6-character sender ID text messages to Indian phone numbers with 99.7% delivery SLA.",
    },
    {
      id: "email",
      name: "ConvertKit & Brevo",
      category: "marketing" as AppCategory,
      badge: "Email Marketing",
      icon: <EmailMarketingIcon className="w-6 h-6 text-emerald-600" />,
      connected: config.emailMarketing?.provider !== "none" && !!config.emailMarketing?.apiKey,
      headline: "Auto-sync customers into segmented email sequences",
      description: "Applies 'Tysonpe Customer' tags in ConvertKit, Mailchimp, or Brevo to trigger automated onboarding funnels.",
    },
    {
      id: "domain",
      name: "Custom Domain & SSL",
      category: "storefront" as AppCategory,
      badge: "White-label Store",
      icon: <CustomDomainIcon className="w-6 h-6 text-amber-600" />,
      connected: !!config.customDomain?.verified,
      headline: "Host your storefront on your custom branded domain",
      description: "Point your subdomain (e.g. learn.yourbrand.com) via CNAME. Automated SSL provisioning with sub-second edge routing.",
    },
    {
      id: "pixels",
      name: "Meta Pixel & GA4",
      category: "marketing" as AppCategory,
      badge: "Attribution & Ads",
      icon: <MetaPixelIcon className="w-6 h-6" />,
      connected: !!(config.tracking?.metaPixelId || config.tracking?.googleAnalyticsId),
      headline: "Conversion API & Google Tag Manager tracking",
      description: "Fire InitiateCheckout and Purchase events with exact rupee amounts for precision ROAS optimization on Meta & Google Ads.",
    },
    {
      id: "webhooks",
      name: "Developer Webhooks",
      category: "automation" as AppCategory,
      badge: "HMAC Signed API",
      icon: <WebhookApiIcon className="w-6 h-6 text-ink" />,
      connected: config.webhooks?.some((h) => h.enabled) ?? false,
      headline: "Enterprise HTTP event relays for custom backends & Zapier",
      description: "Deliver real-time JSON payloads for order.paid, lead.created, and course.completed with HMAC-SHA256 signatures.",
    },
    {
      id: "zoom",
      name: "Zoom & Google Meet",
      category: "storefront" as AppCategory,
      badge: "Live Cohorts",
      icon: <ZoomMeetingIcon className="w-6 h-6" />,
      connected: !!config.liveClass?.meetingUrl,
      headline: "Automated webinar & live class access link unlocks",
      description: "Locks webinar access behind verified payments and reveals unique join links 15 minutes before showtime.",
    },
    {
      id: "telegram",
      name: "Telegram Channel",
      category: "community" as AppCategory,
      badge: "VIP Community",
      icon: <TelegramChannelIcon className="w-6 h-6" />,
      connected: !!config.telegram?.channelUrl,
      headline: "Invite paying customers to private Telegram groups",
      description: "Displays one-click Telegram VIP invitation on order confirmation screens and receipt emails.",
    },
  ];

  const filteredApps = appDirectory.filter((app) => {
    const matchesCategory = selectedCategory === "all" || app.category === selectedCategory;
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium flex items-center gap-2.5 transition-all animate-in fade-in slide-in-from-bottom-2 ${
            toastMsg.ok
              ? "bg-surface text-ink border-line shadow-emerald-500/10"
              : "bg-surface text-amber-700 border-amber-200 shadow-amber-500/10"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              toastMsg.ok ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          {toastMsg.text}
        </div>
      )}

      {/* Top Hero Section */}
      <div className="card p-6 md:p-8 bg-surface border-line relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-40 bg-gradient-to-bl from-brand/5 via-brand/[0.02] to-transparent pointer-events-none rounded-tr-xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-semibold tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              Creator Integration Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-display">
              Connect Tools, Communities & Inbound Webhooks
            </h1>
            <p className="text-sm text-ink-muted leading-relaxed">
              Supercharge your creator operations like Graphy and Stripe. Generate inbound webhook endpoints to ingest partner payments, auto-stream leads to Google Sheets, broadcast orders to Discord, and dispatch DLT SMS receipts.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="p-3.5 rounded-xl bg-warm-cream/40 border border-line flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Active Apps
              </span>
              <span className="text-xl font-bold text-ink tabular-nums mt-0.5">
                {connectedCount} / {appDirectory.length}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium mt-1">Live Sync</span>
            </div>

            <div className="p-3.5 rounded-xl bg-warm-cream/40 border border-line flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Inbound Ingest
              </span>
              <span className="text-xl font-bold text-ink tabular-nums mt-0.5">
                {config.inboundEndpoints?.length || 0}
              </span>
              <span className="text-[10px] text-ink-muted font-medium mt-1">Endpoints</span>
            </div>

            <div className="p-3.5 rounded-xl bg-warm-cream/40 border border-line flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Relay Health
              </span>
              <span className="text-xl font-bold text-emerald-600 tabular-nums mt-0.5">
                99.98%
              </span>
              <span className="text-[10px] text-ink-muted font-medium mt-1">Edge SLA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-warm-cream/60 border border-line overflow-x-auto scrollbar-none">
          {(
            [
              { id: "all", label: "All Apps" },
              { id: "automation", label: "Automation & Data" },
              { id: "community", label: "Community & SMS" },
              { id: "marketing", label: "Marketing & Pixels" },
              { id: "storefront", label: "Storefront & Media" },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-surface text-ink shadow-xs border border-line"
                  : "text-ink-muted hover:text-ink hover:bg-surface/50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs px-3.5 py-2 rounded-xl bg-surface border border-line text-ink placeholder:text-ink-muted/60 focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      {/* App Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredApps.map((app) => (
          <div
            key={app.id}
            className="card card-elevated p-5 flex flex-col justify-between group hover:border-brand/40 transition-all duration-150"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3.5">
                <div className="w-12 h-12 rounded-xl bg-warm-cream/50 border border-line flex items-center justify-center p-2.5 shadow-xs group-hover:scale-105 transition-transform duration-150">
                  {app.icon}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                      app.connected
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-warm-cream text-ink-muted border border-line"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        app.connected ? "bg-emerald-500" : "bg-ink-muted/40"
                      }`}
                    />
                    {app.connected ? "Connected" : "Available"}
                  </span>
                  <span className="text-[10px] text-ink-muted uppercase tracking-wider font-semibold">
                    {app.badge}
                  </span>
                </div>
              </div>

              <h3 className="text-base font-bold text-ink font-display tracking-tight group-hover:text-brand transition-colors">
                {app.name}
              </h3>
              <p className="text-xs font-medium text-ink-muted mt-1 leading-snug">
                {app.headline}
              </p>
              <p className="text-xs text-ink-muted/80 mt-2 line-clamp-2 leading-relaxed">
                {app.description}
              </p>
            </div>

            <div className="pt-5 mt-5 border-t border-line flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => openAppModal(app.id as ModalAppId, "settings")}
                className="btn-secondary text-xs px-3 py-1.5 flex-1 justify-center active:scale-[0.98] transition-all"
              >
                Configure
              </button>
              <button
                type="button"
                onClick={() => openAppModal(app.id as ModalAppId, "test")}
                className="btn-primary text-xs px-3 py-1.5 justify-center flex items-center gap-1 active:scale-[0.98] transition-all bg-brand/90 hover:bg-brand"
              >
                <span>⚡ Test Sandbox</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================= */}
      {/* MODAL: Inbound Webhooks & Automated Payment Records       */}
      {/* ========================================================= */}
      {activeModal === "inbound" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="card max-w-3xl w-full bg-surface border-line shadow-2xl p-6 relative max-h-[92vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warm-cream/50 border border-line flex items-center justify-center p-2">
                  <InboundWebhookIcon className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink font-display">Inbound Webhooks & Payment Automation</h3>
                  <p className="text-xs text-ink-muted">Consume partner & ERP webhooks (Jodo, etc.) to automate payment records</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-ink-muted hover:text-ink text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 border-b border-line pb-1">
              <button
                onClick={() => setModalTab("settings")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  modalTab === "settings" ? "bg-warm-cream text-ink border border-line" : "text-ink-muted hover:text-ink"
                }`}
              >
                Endpoints & URLs ({config.inboundEndpoints?.length || 0})
              </button>
              <button
                onClick={() => setModalTab("test")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  modalTab === "test" ? "bg-warm-cream text-ink border border-line" : "text-ink-muted hover:text-ink"
                }`}
              >
                <span>⚡ Live Inbound Sandbox</span>
              </button>
              <button
                onClick={() => setModalTab("logs")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  modalTab === "logs" ? "bg-warm-cream text-ink border border-line" : "text-ink-muted hover:text-ink"
                }`}
              >
                <span>Event History ({config.inboundLogs?.length || 0})</span>
              </button>
            </div>

            {/* Tab 1: Endpoints & URLs */}
            {modalTab === "settings" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Your Inbound Receivers</h4>
                    <p className="text-[11px] text-ink-muted">Configure your payment gateway partner or ERP to POST payment events to these URLs.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddInbound(!showAddInbound)}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    {showAddInbound ? "Hide Form" : "+ Generate Endpoint"}
                  </button>
                </div>

                {/* Form to generate new endpoint */}
                {showAddInbound && (
                  <form onSubmit={handleGenerateInboundEndpoint} className="p-4 rounded-xl bg-warm-cream/40 border border-line space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-ink block mb-1">
                        Endpoint Friendly Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newInboundName}
                        onChange={(e) => setNewInboundName(e.target.value)}
                        placeholder="e.g. Jodo Fee Partner, College ERP Payment Hook"
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-ink block mb-1">
                          Partner Preset
                        </label>
                        <select
                          value={newInboundPartner}
                          onChange={(e) => setNewInboundPartner(e.target.value as any)}
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                        >
                          <option value="jodo">Jodo / Institutional Gateway (Default)</option>
                          <option value="generic">Generic E-Commerce Payment</option>
                          <option value="custom">Custom Webhook Schema</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-ink block mb-1">
                          Auth Secret (Optional)
                        </label>
                        <input
                          type="text"
                          value={newInboundSecret}
                          onChange={(e) => setNewInboundSecret(e.target.value)}
                          placeholder="Optional Bearer token or secret"
                          className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddInbound(false)}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="btn-primary text-xs px-3 py-1.5"
                      >
                        {isPending ? "Generating..." : "Generate Webhook URL"}
                      </button>
                    </div>
                  </form>
                )}

                {/* List of active endpoints */}
                <div className="space-y-3">
                  {(!config.inboundEndpoints || config.inboundEndpoints.length === 0) ? (
                    <div className="p-8 text-center border border-dashed border-line rounded-xl text-ink-muted text-xs space-y-3">
                      <p>You haven't generated an inbound endpoint yet.</p>
                      <button
                        type="button"
                        onClick={handleAutoProvisionInbound}
                        className="btn-primary text-xs px-4 py-2"
                      >
                        ⚡ Generate My Inbound Jodo Webhook URL
                      </button>
                    </div>
                  ) : (
                    config.inboundEndpoints.map((ep) => {
                      const fullUrl = `${typeof window !== "undefined" ? window.location.origin : "https://tysonpe.com"}/api/webhooks/inbound/${ep.token}`;
                      return (
                        <div
                          key={ep.id}
                          className="p-4 rounded-xl bg-surface border border-line space-y-3 hover:border-brand/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="text-xs font-bold text-ink font-display">{ep.name}</h5>
                                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-brand/10 text-brand border border-brand/20">
                                  {ep.partner}
                                </span>
                              </div>
                              <span className="text-[11px] text-ink-muted">
                                Created on {new Date(ep.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleInboundEndpoint(ep.id, !ep.enabled)}
                                className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition-all ${
                                  ep.enabled
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-warm-cream text-ink-muted border border-line"
                                }`}
                              >
                                {ep.enabled ? "Live & Ingesting" : "Paused"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteInboundEndpoint(ep.id)}
                                className="text-xs text-amber-700 hover:text-amber-900"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {/* Endpoint URL bar with copy */}
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-warm-cream/50 border border-line">
                            <span className="text-[10px] font-mono font-bold text-ink-muted uppercase">POST</span>
                            <input
                              type="text"
                              readOnly
                              value={fullUrl}
                              className="text-xs font-mono bg-transparent text-ink flex-1 outline-none truncate"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(fullUrl);
                                showToast("Inbound webhook URL copied to clipboard!");
                              }}
                              className="btn-secondary text-[11px] px-2.5 py-1 shrink-0"
                            >
                              Copy URL
                            </button>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-ink-muted font-mono pt-1 border-t border-line/60">
                            <span>Total Ingested: <strong>{ep.totalReceived || 0}</strong></span>
                            {ep.lastEvent && <span>Last Event: <code>{ep.lastEvent}</code></span>}
                            {ep.lastReceivedAt && (
                              <span>Last active: {new Date(ep.lastReceivedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Live Inbound Sandbox */}
            {modalTab === "test" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-ink-muted">
                    Paste any JSON webhook payload from your payment gateway partner (e.g. Jodo, Razorpay, ERP) to test automated payment record creation.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setInboundPayloadText(DEFAULT_SAMPLE_PAYLOAD)}
                      className="text-[11px] text-brand hover:underline font-semibold"
                    >
                      Reset to Jodo Partner Payload
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={12}
                    value={inboundPayloadText}
                    onChange={(e) => setInboundPayloadText(e.target.value)}
                    className="w-full text-[11px] font-mono p-3.5 rounded-xl bg-ink text-white/90 border border-line focus:outline-none focus:ring-2 focus:ring-brand/40 leading-relaxed scrollbar-thin"
                    spellCheck={false}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleTestInboundWebhook}
                  disabled={testLoading}
                  className="btn-primary text-xs px-4 py-2.5 flex items-center gap-2 w-full justify-center"
                >
                  {testLoading ? "Processing inbound webhook..." : "⚡ Simulate Inbound Payment Webhook Delivery"}
                </button>

                {inboundTestResult && (
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-3 transition-all ${
                      inboundTestResult.ok
                        ? "bg-emerald-50/60 border-emerald-200 text-ink"
                        : "bg-amber-50/60 border-amber-200 text-ink"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-bold text-ink">
                          {inboundTestResult.ok ? "✅ Inbound Webhook Processed & Payment Automated" : "❌ Processing Failed"}
                        </span>
                      </div>
                      {inboundTestResult.latencyMs && (
                        <span className="text-[11px] font-mono font-medium text-ink-muted">
                          {inboundTestResult.latencyMs}ms execution
                        </span>
                      )}
                    </div>

                    {inboundTestResult.error ? (
                      <p className="text-amber-800">{inboundTestResult.error}</p>
                    ) : (
                      <div className="space-y-3 pt-1">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                          <div className="p-2.5 rounded-lg bg-surface border border-line">
                            <span className="text-[10px] text-ink-muted uppercase block font-semibold">Order ID</span>
                            <span className="font-bold text-ink truncate block">{inboundTestResult.orderId}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-surface border border-line">
                            <span className="text-[10px] text-ink-muted uppercase block font-semibold">Tax Invoice No</span>
                            <span className="font-bold text-brand truncate block">{inboundTestResult.invoiceNo || "Allocated"}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-surface border border-line">
                            <span className="text-[10px] text-ink-muted uppercase block font-semibold">Total Amount</span>
                            <span className="font-bold text-emerald-700 block">
                              ₹{((inboundTestResult.amountPaise || 1000000) / 100).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-surface border border-line">
                            <span className="text-[10px] text-ink-muted uppercase block font-semibold">Status Gate</span>
                            <span className="font-bold text-good block">PAID (Reconciled)</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-surface border border-line space-y-1 text-xs">
                          <div className="font-semibold text-ink flex items-center justify-between">
                            <span>Customer: {inboundTestResult.customerName}</span>
                            <span className="text-[11px] text-ink-muted font-mono">{inboundTestResult.customerEmail}</span>
                          </div>
                          <p className="text-ink-muted text-[11px]">
                            • Buyer account verified & enrolled into course catalog.
                            <br />
                            • Net ledger credit calculated & queued for next T+1 automated UPI settlement.
                            <br />
                            • Lead status converted to Customer with updated LTV in CRM dashboard.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Event History Logs */}
            {modalTab === "logs" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-ink uppercase tracking-wider">Ingested Webhook Feed</h4>
                  <span className="text-[11px] text-ink-muted font-mono">{config.inboundLogs?.length || 0} payloads stored</span>
                </div>

                {(!config.inboundLogs || config.inboundLogs.length === 0) ? (
                  <div className="p-8 text-center border border-dashed border-line rounded-xl text-ink-muted text-xs">
                    No webhooks received yet. Use the "Live Inbound Sandbox" tab to simulate your first partner webhook!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {config.inboundLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-xl bg-surface border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-brand/40 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-xs font-bold font-mono text-ink">{log.event}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              HTTP {log.statusCode || 200}
                            </span>
                            {log.invoiceNo && (
                              <span className="text-[10px] font-mono text-brand font-semibold">
                                {log.invoiceNo}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-ink-muted">
                            Order: <code className="font-mono text-ink">{log.orderId}</code> • Customer: <strong>{log.customerName || "Customer"}</strong> {log.amountPaise && `(₹${(log.amountPaise / 100).toLocaleString("en-IN")})`}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] font-mono text-ink-muted">
                            {new Date(log.receivedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedLogForInspect(log)}
                            className="text-[11px] font-semibold text-brand hover:underline px-2 py-1 rounded bg-brand/5 border border-brand/20"
                          >
                            Inspect JSON
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* JSON Inspector Popover */}
      {selectedLogForInspect && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="card max-w-2xl w-full bg-surface border-line shadow-2xl p-6 relative max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h4 className="text-sm font-bold text-ink font-display">Inbound Webhook Payload Inspector</h4>
                <p className="text-[11px] font-mono text-ink-muted">Event: {selectedLogForInspect.event} • ID: {selectedLogForInspect.eventId}</p>
              </div>
              <button
                onClick={() => setSelectedLogForInspect(null)}
                className="text-ink-muted hover:text-ink text-sm p-1"
              >
                ✕
              </button>
            </div>

            <pre className="p-3.5 rounded-xl bg-ink text-white/90 text-[11px] font-mono overflow-x-auto leading-relaxed max-h-[60vh] scrollbar-thin">
              {JSON.stringify(selectedLogForInspect.rawPayload || selectedLogForInspect, null, 2)}
            </pre>

            <div className="flex justify-end pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setSelectedLogForInspect(null)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Google Sheets                                      */}
      {/* ========================================================= */}
      {activeModal === "sheets" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="card max-w-2xl w-full bg-surface border-line shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warm-cream/50 border border-line flex items-center justify-center p-2">
                  <GoogleSheetsIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink font-display">Google Sheets Integration</h3>
                  <p className="text-xs text-ink-muted">Auto-stream every transaction and CRM lead to Google Drive</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-ink-muted hover:text-ink text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 border-b border-line mt-4 mb-5 pb-1">
              <button
                onClick={() => setModalTab("settings")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  modalTab === "settings" ? "bg-warm-cream text-ink border border-line" : "text-ink-muted hover:text-ink"
                }`}
              >
                Settings & Credentials
              </button>
              <button
                onClick={() => setModalTab("test")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  modalTab === "test" ? "bg-warm-cream text-ink border border-line" : "text-ink-muted hover:text-ink"
                }`}
              >
                <span>⚡ Live Test Simulator</span>
              </button>
            </div>

            {modalTab === "settings" ? (
              <form onSubmit={handleSaveSheets} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                    Google Spreadsheet ID
                  </label>
                  <input
                    type="text"
                    value={sheetsForm.spreadsheetId || ""}
                    onChange={(e) => setSheetsForm({ ...sheetsForm, spreadsheetId: e.target.value })}
                    placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                  <p className="text-[11px] text-ink-muted mt-1">
                    Found in your Google Sheet URL between <code>/d/</code> and <code>/edit</code>. Share edit access with <code>integrations@tysonpe.com</code>.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                    Sheet Tab Name
                  </label>
                  <input
                    type="text"
                    value={sheetsForm.sheetName || "Tysonpe Orders"}
                    onChange={(e) => setSheetsForm({ ...sheetsForm, sheetName: e.target.value })}
                    className="w-full text-xs px-3.5 py-2 rounded-xl bg-surface border border-line text-ink"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sheetsForm.syncOnOrder}
                      onChange={(e) => setSheetsForm({ ...sheetsForm, syncOnOrder: e.target.checked })}
                      className="rounded border-line text-brand focus:ring-brand"
                    />
                    <span className="text-xs font-medium text-ink">Sync when an order is paid (with price, customer, UTR)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sheetsForm.syncOnLead}
                      onChange={(e) => setSheetsForm({ ...sheetsForm, syncOnLead: e.target.checked })}
                      className="rounded border-line text-brand focus:ring-brand"
                    />
                    <span className="text-xs font-medium text-ink">Sync prospective leads captured from storefront</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-line">
                    <input
                      type="checkbox"
                      checked={sheetsForm.enabled}
                      onChange={(e) => setSheetsForm({ ...sheetsForm, enabled: e.target.checked })}
                      className="rounded border-line text-brand focus:ring-brand"
                    />
                    <span className="text-xs font-semibold text-ink">Enable live sync to this spreadsheet</span>
                  </label>
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="btn-secondary text-xs px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-primary text-xs px-4 py-2"
                  >
                    {isPending ? "Saving..." : "Save Configuration"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-ink-muted">
                  Test your connection by simulating a real customer purchase and observing row generation.
                </p>

                <button
                  type="button"
                  onClick={handleTestSheets}
                  disabled={testLoading}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-2 w-full justify-center"
                >
                  {testLoading ? "Testing Google Sheets sync..." : "⚡ Run Live Sheet Append Test"}
                </button>

                {sheetsTestResult && (
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-3 ${
                      sheetsTestResult.ok
                        ? "bg-emerald-50/50 border-emerald-200"
                        : "bg-amber-50/50 border-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">
                        {sheetsTestResult.ok ? "✅ Test Row Successfully Appended" : "❌ Connection Failed"}
                      </span>
                      {sheetsTestResult.latencyMs && (
                        <span className="text-[11px] font-mono font-medium text-ink-muted">
                          {sheetsTestResult.latencyMs}ms roundtrip
                        </span>
                      )}
                    </div>

                    {sheetsTestResult.error && (
                      <p className="text-amber-800">{sheetsTestResult.error}</p>
                    )}

                    {sheetsTestResult.sampleRow && (
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                          Appended Row Preview:
                        </span>
                        <div className="overflow-x-auto rounded-lg border border-line bg-surface p-2">
                          <table className="w-full text-[11px] font-mono text-ink text-left">
                            <tbody>
                              <tr className="border-b border-line text-ink-muted">
                                <th className="p-1.5">Timestamp</th>
                                <th className="p-1.5">Order ID</th>
                                <th className="p-1.5">Customer</th>
                                <th className="p-1.5">Email</th>
                                <th className="p-1.5">Phone</th>
                                <th className="p-1.5">Amount</th>
                                <th className="p-1.5">Status</th>
                              </tr>
                              <tr>
                                {sheetsTestResult.sampleRow.slice(0, 7).map((cell, idx) => (
                                  <td key={idx} className="p-1.5 whitespace-nowrap">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Discord                                            */}
      {/* ========================================================= */}
      {activeModal === "discord" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="card max-w-2xl w-full bg-surface border-line shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warm-cream/50 border border-line flex items-center justify-center p-2">
                  <DiscordIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink font-display">Discord VIP Webhook</h3>
                  <p className="text-xs text-ink-muted">Broadcast sales & new customer alerts to your Discord server</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-ink-muted hover:text-ink text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 border-b border-line mt-4 mb-5 pb-1">
              <button
                onClick={() => setModalTab("settings")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  modalTab === "settings" ? "bg-warm-cream text-ink border border-line" : "text-ink-muted hover:text-ink"
                }`}
              >
                Settings
              </button>
              <button
                onClick={() => setModalTab("test")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  modalTab === "test" ? "bg-warm-cream text-ink border border-line" : "text-ink-muted hover:text-ink"
                }`}
              >
                <span>⚡ Test Embed Message</span>
              </button>
            </div>

            {modalTab === "settings" ? (
              <form onSubmit={handleSaveDiscord} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                    Discord Incoming Webhook URL
                  </label>
                  <input
                    type="url"
                    value={discordForm.webhookUrl || ""}
                    onChange={(e) => setDiscordForm({ ...discordForm, webhookUrl: e.target.value })}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                  <p className="text-[11px] text-ink-muted mt-1">
                    In Discord: Server Settings → Integrations → Webhooks → New Webhook → Copy Webhook URL.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                    Community Server Invite Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={discordForm.serverInviteUrl || ""}
                    onChange={(e) => setDiscordForm({ ...discordForm, serverInviteUrl: e.target.value })}
                    placeholder="https://discord.gg/yourbrand"
                    className="w-full text-xs px-3.5 py-2 rounded-xl bg-surface border border-line text-ink"
                  />
                  <p className="text-[11px] text-ink-muted mt-1">
                    Displayed to buyers on the confirmation screen for one-click community onboarding.
                  </p>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={discordForm.autoNotifyOnPurchase}
                      onChange={(e) => setDiscordForm({ ...discordForm, autoNotifyOnPurchase: e.target.checked })}
                      className="rounded border-line text-brand focus:ring-brand"
                    />
                    <span className="text-xs font-semibold text-ink">
                      Send rich embed notification for every paid transaction
                    </span>
                  </label>
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="btn-secondary text-xs px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-primary text-xs px-4 py-2"
                  >
                    {isPending ? "Saving..." : "Save Discord Settings"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-ink-muted">
                  Send a test embed notification to verify formatting, role triggers, and network connectivity.
                </p>

                <button
                  type="button"
                  onClick={handleTestDiscord}
                  disabled={testLoading}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-2 w-full justify-center"
                >
                  {testLoading ? "Dispatching Discord Embed..." : "⚡ Dispatch Test Discord Embed"}
                </button>

                {discordTestResult && (
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-3 ${
                      discordTestResult.ok
                        ? "bg-[#2f3136] text-white border-zinc-700"
                        : "bg-amber-50/50 border-amber-200 text-ink"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {discordTestResult.ok ? "✅ Discord Webhook Dispatched" : "❌ Dispatch Failed"}
                      </span>
                      {discordTestResult.latencyMs && (
                        <span className="text-[11px] font-mono opacity-80">
                          {discordTestResult.latencyMs}ms latency
                        </span>
                      )}
                    </div>

                    {discordTestResult.error && (
                      <p className="text-amber-400">{discordTestResult.error}</p>
                    )}

                    {/* Discord message UI preview */}
                    <div className="bg-[#36393f] p-3 rounded-lg border-l-4 border-brand space-y-2 text-zinc-100">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-brand flex items-center justify-center text-[10px] font-bold text-white">
                          T
                        </span>
                        <span className="font-bold text-sm">Tysonpe Bot</span>
                        <span className="text-[10px] bg-brand/30 px-1 rounded text-brand-light">BOT</span>
                      </div>
                      <div className="font-bold text-sm">🎉 New Paid Order - Tysonpe Storefront</div>
                      <p className="text-xs text-zinc-300">
                        <strong>Rahul Sharma</strong> just purchased <strong>Creator Commerce Masterclass</strong>!
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                        <div>
                          <div className="text-[10px] text-zinc-400 uppercase font-semibold">Amount</div>
                          <div className="font-mono">₹4,999.00</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-400 uppercase font-semibold">Gateway</div>
                          <div>UPI Intent (T+1 Payout)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: SMS Gateway                                        */}
      {/* ========================================================= */}
      {activeModal === "sms" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="card max-w-2xl w-full bg-surface border-line shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warm-cream/50 border border-line flex items-center justify-center p-2">
                  <SmsIcon className="w-6 h-6 text-brand" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink font-display">DLT SMS Gateway (Fast2SMS / MSG91)</h3>
                  <p className="text-xs text-ink-muted">High-priority transactional receipts & OTPs</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-ink-muted hover:text-ink text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 border-b border-line mt-4 mb-5 pb-1">
              <button
                onClick={() => setModalTab("settings")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  modalTab === "settings" ? "bg-warm-cream text-ink border border-line" : "text-ink-muted hover:text-ink"
                }`}
              >
                Credentials & Sender ID
              </button>
              <button
                onClick={() => setModalTab("test")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  modalTab === "test" ? "bg-warm-cream text-ink border border-line" : "text-ink-muted hover:text-ink"
                }`}
              >
                <span>⚡ Test SMS Dispatch</span>
              </button>
            </div>

            {modalTab === "settings" ? (
              <form onSubmit={handleSaveSms} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                      Provider
                    </label>
                    <select
                      value={smsForm.provider}
                      onChange={(e) => setSmsForm({ ...smsForm, provider: e.target.value as "fast2sms" | "msg91" })}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                    >
                      <option value="fast2sms">Fast2SMS (Quick DLT)</option>
                      <option value="msg91">MSG91 Enterprise</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                      Sender ID (6 Chars)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={smsForm.senderId || "TYSONP"}
                      onChange={(e) => setSmsForm({ ...smsForm, senderId: e.target.value.toUpperCase() })}
                      className="w-full text-xs font-mono uppercase px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                    SMS Gateway API Key
                  </label>
                  <input
                    type="password"
                    value={smsForm.apiKey || ""}
                    onChange={(e) => setSmsForm({ ...smsForm, apiKey: e.target.value })}
                    placeholder="Enter provider API authorization key"
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smsForm.sendOrderConfirmation}
                      onChange={(e) => setSmsForm({ ...smsForm, sendOrderConfirmation: e.target.checked })}
                      className="rounded border-line text-brand focus:ring-brand"
                    />
                    <span className="text-xs font-medium text-ink">
                      Send instant SMS order confirmation with access link to buyer
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smsForm.sendOtp}
                      onChange={(e) => setSmsForm({ ...smsForm, sendOtp: e.target.checked })}
                      className="rounded border-line text-brand focus:ring-brand"
                    />
                    <span className="text-xs font-medium text-ink">
                      Use SMS for high-speed phone login OTPs
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-line">
                    <input
                      type="checkbox"
                      checked={smsForm.enabled}
                      onChange={(e) => setSmsForm({ ...smsForm, enabled: e.target.checked })}
                      className="rounded border-line text-brand focus:ring-brand"
                    />
                    <span className="text-xs font-semibold text-ink">
                      Enable SMS notifications
                    </span>
                  </label>
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="btn-secondary text-xs px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-primary text-xs px-4 py-2"
                  >
                    {isPending ? "Saving..." : "Save SMS Gateway"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-ink-muted">
                  Test SMS formatting with your configured DLT Sender ID.
                </p>

                <button
                  type="button"
                  onClick={handleTestSms}
                  disabled={testLoading}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-2 w-full justify-center"
                >
                  {testLoading ? "Testing SMS dispatch..." : "⚡ Dispatch Test SMS"}
                </button>

                {smsTestResult && (
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-3 ${
                      smsTestResult.ok
                        ? "bg-emerald-50/50 border-emerald-200"
                        : "bg-amber-50/50 border-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">
                        {smsTestResult.ok ? "✅ SMS Gateway Validated" : "❌ SMS Dispatch Failed"}
                      </span>
                      {smsTestResult.latencyMs && (
                        <span className="text-[11px] font-mono text-ink-muted">
                          {smsTestResult.latencyMs}ms delivery latency
                        </span>
                      )}
                    </div>

                    {smsTestResult.error && (
                      <p className="text-amber-800">{smsTestResult.error}</p>
                    )}

                    {smsTestResult.previewText && (
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                          Simulated Phone Screen:
                        </span>
                        <div className="max-w-xs mx-auto p-3.5 rounded-2xl bg-surface border border-line shadow-sm space-y-2">
                          <div className="flex items-center justify-between text-[10px] text-ink-muted border-b border-line pb-1">
                            <span>SMS from {smsForm.senderId || "TYSONP"}</span>
                            <span>Just now</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-warm-cream/50 text-ink text-xs font-sans leading-relaxed">
                            {smsTestResult.previewText}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Custom Domain & SSL                                */}
      {/* ========================================================= */}
      {activeModal === "domain" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="card max-w-2xl w-full bg-surface border-line shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warm-cream/50 border border-line flex items-center justify-center p-2">
                  <CustomDomainIcon className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink font-display">Custom Domain & White-Label SSL</h3>
                  <p className="text-xs text-ink-muted">Run your storefront on your own brand's web address</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-ink-muted hover:text-ink text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 border-b border-line mt-4 mb-5 pb-1">
              <button
                onClick={() => setModalTab("settings")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  modalTab === "settings" ? "bg-warm-cream text-ink border border-line" : "text-ink-muted hover:text-ink"
                }`}
              >
                Domain Settings
              </button>
              <button
                onClick={() => setModalTab("test")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  modalTab === "test" ? "bg-warm-cream text-ink border border-line" : "text-ink-muted hover:text-ink"
                }`}
              >
                <span>⚡ Verify DNS & SSL</span>
              </button>
            </div>

            {modalTab === "settings" ? (
              <form onSubmit={handleSaveDomain} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                    Your Domain or Subdomain
                  </label>
                  <input
                    type="text"
                    value={domainForm.domain || ""}
                    onChange={(e) => setDomainForm({ ...domainForm, domain: e.target.value })}
                    placeholder="e.g. learn.mycreatorhub.com"
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                  />
                  <p className="text-[11px] text-ink-muted mt-1">
                    Default storefront URL: <code>https://tysonpe.com/c/{creatorHandle}</code>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-warm-cream/50 border border-line space-y-2 text-xs">
                  <span className="font-semibold text-ink block">DNS Configuration Instructions:</span>
                  <div className="font-mono text-[11px] space-y-1">
                    <p>Type: <strong>CNAME</strong></p>
                    <p>Name / Host: <strong>{domainForm.domain ? domainForm.domain.split(".")[0] : "learn"}</strong></p>
                    <p>Target / Points to: <strong>cname.tysonpe.com</strong></p>
                    <p>Proxy status: <strong>DNS only (TTL: Auto)</strong></p>
                  </div>
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="btn-secondary text-xs px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-primary text-xs px-4 py-2"
                  >
                    {isPending ? "Saving..." : "Save Custom Domain"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-ink-muted">
                  Perform automated DNS edge resolution and check SSL certificate issuance.
                </p>

                <button
                  type="button"
                  onClick={handleVerifyDomain}
                  disabled={testLoading}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-2 w-full justify-center"
                >
                  {testLoading ? "Resolving DNS & SSL..." : "⚡ Verify DNS & Check SSL Status"}
                </button>

                {domainTestResult && (
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-3 ${
                      domainTestResult.ok
                        ? "bg-emerald-50/50 border-emerald-200"
                        : "bg-amber-50/50 border-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">
                        {domainTestResult.ok ? "✅ Domain Verified & SSL Active" : "❌ Verification Pending"}
                      </span>
                      {domainTestResult.latencyMs && (
                        <span className="text-[11px] font-mono text-ink-muted">
                          {domainTestResult.latencyMs}ms DNS probe
                        </span>
                      )}
                    </div>

                    {domainTestResult.dnsRecord && (
                      <div className="font-mono text-[11px] p-2.5 rounded-lg bg-surface border border-line space-y-1">
                        <div className="text-emerald-700 font-semibold">✓ CNAME record found: cname.tysonpe.com</div>
                        <div className="text-emerald-700 font-semibold">✓ Let's Encrypt TLS 1.3 Active</div>
                        <div className="text-ink-muted">Edge Location: BOM1 (Mumbai AWS CloudFront)</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Email Marketing                                    */}
      {/* ========================================================= */}
      {activeModal === "email" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="card max-w-2xl w-full bg-surface border-line shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warm-cream/50 border border-line flex items-center justify-center p-2">
                  <EmailMarketingIcon className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink font-display">Email Marketing & Audience Sync</h3>
                  <p className="text-xs text-ink-muted">ConvertKit, Brevo, Mailchimp & ActiveCampaign</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-ink-muted hover:text-ink text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 border-b border-line mt-4 mb-5 pb-1">
              <button
                onClick={() => setModalTab("settings")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  modalTab === "settings" ? "bg-warm-cream text-ink border border-line" : "text-ink-muted hover:text-ink"
                }`}
              >
                Settings
              </button>
              <button
                onClick={() => setModalTab("test")}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  modalTab === "test" ? "bg-warm-cream text-ink border border-line" : "text-ink-muted hover:text-ink"
                }`}
              >
                <span>⚡ Test Audience Sync</span>
              </button>
            </div>

            {modalTab === "settings" ? (
              <form onSubmit={handleSaveEmail} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                      Provider
                    </label>
                    <select
                      value={emailForm.provider}
                      onChange={(e) => setEmailForm({ ...emailForm, provider: e.target.value as any })}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                    >
                      <option value="none">Disabled</option>
                      <option value="convertkit">ConvertKit (Kit)</option>
                      <option value="brevo">Brevo (Sendinblue)</option>
                      <option value="mailchimp">Mailchimp</option>
                      <option value="activecampaign">ActiveCampaign</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                      Audience / List ID
                    </label>
                    <input
                      type="text"
                      value={emailForm.audienceId || ""}
                      onChange={(e) => setEmailForm({ ...emailForm, audienceId: e.target.value })}
                      placeholder="e.g. aud_98234 or tag_id"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={emailForm.apiKey || ""}
                    onChange={(e) => setEmailForm({ ...emailForm, apiKey: e.target.value })}
                    placeholder="Enter email service API key"
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                    Customer Tag
                  </label>
                  <input
                    type="text"
                    value={emailForm.tag || "Tysonpe Customer"}
                    onChange={(e) => setEmailForm({ ...emailForm, tag: e.target.value })}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailForm.autoSyncLearners}
                      onChange={(e) => setEmailForm({ ...emailForm, autoSyncLearners: e.target.checked })}
                      className="rounded border-line text-brand focus:ring-brand"
                    />
                    <span className="text-xs font-semibold text-ink">
                      Automatically add every learner to this list upon purchase
                    </span>
                  </label>
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="btn-secondary text-xs px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-primary text-xs px-4 py-2"
                  >
                    {isPending ? "Saving..." : "Save Email Settings"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-ink-muted">
                  Simulate contact tagging and list synchronization for a test buyer.
                </p>

                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={testLoading}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-2 w-full justify-center"
                >
                  {testLoading ? "Testing email sync..." : "⚡ Run Test Audience Sync"}
                </button>

                {emailTestResult && (
                  <div
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      emailTestResult.ok
                        ? "bg-emerald-50/50 border-emerald-200"
                        : "bg-amber-50/50 border-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">
                        {emailTestResult.ok ? "✅ Contact Synced & Tagged" : "❌ Sync Failed"}
                      </span>
                      {emailTestResult.latencyMs && (
                        <span className="text-[11px] font-mono text-ink-muted">
                          {emailTestResult.latencyMs}ms latency
                        </span>
                      )}
                    </div>
                    {emailTestResult.syncedEmail && (
                      <p className="text-ink">
                        Contact <code>{emailTestResult.syncedEmail}</code> tagged with:{" "}
                        <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                          {emailTestResult.tag}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Tracking Pixels                                    */}
      {/* ========================================================= */}
      {activeModal === "pixels" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="card max-w-2xl w-full bg-surface border-line shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warm-cream/50 border border-line flex items-center justify-center p-2">
                  <MetaPixelIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink font-display">Tracking Pixels & Analytics</h3>
                  <p className="text-xs text-ink-muted">Meta Pixel, Google Analytics 4, and GTM Container</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-ink-muted hover:text-ink text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTracking} className="space-y-4 mt-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                  Meta (Facebook) Pixel ID
                </label>
                <input
                  type="text"
                  value={trackingForm.metaPixelId || ""}
                  onChange={(e) => setTrackingForm({ ...trackingForm, metaPixelId: e.target.value })}
                  placeholder="e.g. 192837465019283"
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                  Google Analytics 4 Measurement ID
                </label>
                <input
                  type="text"
                  value={trackingForm.googleAnalyticsId || ""}
                  onChange={(e) => setTrackingForm({ ...trackingForm, googleAnalyticsId: e.target.value })}
                  placeholder="e.g. G-ABC123XYZ"
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                  Google Tag Manager Container ID
                </label>
                <input
                  type="text"
                  value={trackingForm.gtmContainerId || ""}
                  onChange={(e) => setTrackingForm({ ...trackingForm, gtmContainerId: e.target.value })}
                  placeholder="e.g. GTM-XXXXXXX"
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trackingForm.enabled}
                    onChange={(e) => setTrackingForm({ ...trackingForm, enabled: e.target.checked })}
                    className="rounded border-line text-brand focus:ring-brand"
                  />
                  <span className="text-xs font-semibold text-ink">
                    Inject pixels into live storefront checkout pages
                  </span>
                </label>
              </div>

              <div className="pt-4 border-t border-line flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary text-xs px-4 py-2"
                >
                  {isPending ? "Saving..." : "Save Tracking Pixels"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Developer Webhooks                                 */}
      {/* ========================================================= */}
      {activeModal === "webhooks" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="card max-w-3xl w-full bg-surface border-line shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warm-cream/50 border border-line flex items-center justify-center p-2">
                  <WebhookApiIcon className="w-6 h-6 text-ink" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink font-display">Developer Webhook Endpoints</h3>
                  <p className="text-xs text-ink-muted">HMAC-SHA256 authenticated event relays</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-ink-muted hover:text-ink text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-ink-muted">
                Receive instant HTTP POST callbacks whenever payments, leads, or course completions occur.
              </p>
              <button
                type="button"
                onClick={() => setShowAddWebhook(!showAddWebhook)}
                className="btn-primary text-xs px-3 py-1.5"
              >
                {showAddWebhook ? "Hide Form" : "+ Add Endpoint"}
              </button>
            </div>

            {/* Add Webhook Form */}
            {showAddWebhook && (
              <form onSubmit={handleAddWebhookSubmit} className="p-4 rounded-xl bg-warm-cream/40 border border-line space-y-3">
                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">
                    Endpoint URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://api.yourdomain.com/webhooks/tysonpe"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">
                    Signing Secret (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Leave empty to auto-generate secret"
                    value={newWebhookSecret}
                    onChange={(e) => setNewWebhookSecret(e.target.value)}
                    className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">
                    Events to Listen For
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {AVAILABLE_EVENTS.map((ev) => (
                      <label key={ev.id} className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(ev.id)}
                          onChange={() => {
                            setSelectedEvents((prev) =>
                              prev.includes(ev.id) ? prev.filter((x) => x !== ev.id) : [...prev, ev.id]
                            );
                          }}
                          className="rounded border-line text-brand"
                        />
                        <span className="font-mono text-[11px]">{ev.id}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddWebhook(false)}
                    className="btn-secondary text-xs px-3 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-primary text-xs px-3 py-1.5"
                  >
                    {isPending ? "Adding..." : "Add Endpoint"}
                  </button>
                </div>
              </form>
            )}

            {/* List of Webhooks */}
            <div className="space-y-3">
              {config.webhooks.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-line rounded-xl text-ink-muted text-xs">
                  No webhook endpoints registered yet. Click "+ Add Endpoint" to register your first endpoint.
                </div>
              ) : (
                config.webhooks.map((hook) => (
                  <div
                    key={hook.id}
                    className="p-4 rounded-xl bg-surface border border-line space-y-2 hover:border-brand/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-ink truncate">
                        {hook.url}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTestWebhookEndpoint(hook)}
                          className="text-[11px] font-semibold text-brand hover:underline px-2 py-0.5 rounded bg-brand/5 border border-brand/20"
                        >
                          ⚡ Test Ping
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            startTransition(async () => {
                              await toggleWebhookEndpointAction(hook.id, !hook.enabled);
                              setConfig((prev) => ({
                                ...prev,
                                webhooks: prev.webhooks.map((h) =>
                                  h.id === hook.id ? { ...h, enabled: !h.enabled } : h
                                ),
                              }));
                            });
                          }}
                          className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                            hook.enabled
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-warm-cream text-ink-muted border border-line"
                          }`}
                        >
                          {hook.enabled ? "Active" : "Paused"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!confirm("Delete this webhook?")) return;
                            startTransition(async () => {
                              await deleteWebhookEndpointAction(hook.id);
                              setConfig((prev) => ({
                                ...prev,
                                webhooks: prev.webhooks.filter((h) => h.id !== hook.id),
                              }));
                            });
                          }}
                          className="text-xs text-amber-700 hover:text-amber-900"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {hook.events.map((ev) => (
                        <span
                          key={ev}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-warm-cream text-ink-muted border border-line"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>

                    {webhookTestResult && webhookTestResult.hookId === hook.id && (
                      <div className="mt-2 p-2 rounded-lg bg-warm-cream/50 border border-line text-[11px] font-mono flex items-center justify-between">
                        <span>
                          Status: HTTP {webhookTestResult.statusCode || 200}
                        </span>
                        <span>Latency: {webhookTestResult.latencyMs}ms</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Zoom & Cohorts                                     */}
      {/* ========================================================= */}
      {activeModal === "zoom" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="card max-w-2xl w-full bg-surface border-line shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warm-cream/50 border border-line flex items-center justify-center p-2">
                  <ZoomMeetingIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink font-display">Zoom & Live Cohorts</h3>
                  <p className="text-xs text-ink-muted">Webinar links unlocked automatically upon paid checkout</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-ink-muted hover:text-ink text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLiveClass} className="space-y-4 mt-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                  Default Platform
                </label>
                <select
                  value={liveClassForm.defaultProvider}
                  onChange={(e) => setLiveClassForm({ ...liveClassForm, defaultProvider: e.target.value as any })}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                >
                  <option value="zoom">Zoom Video</option>
                  <option value="google_meet">Google Meet</option>
                  <option value="youtube_live">YouTube Live (Unlisted)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                  Meeting Join URL
                </label>
                <input
                  type="url"
                  value={liveClassForm.meetingUrl || ""}
                  onChange={(e) => setLiveClassForm({ ...liveClassForm, meetingUrl: e.target.value })}
                  placeholder="https://zoom.us/j/123456789"
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                  Meeting Passcode (Optional)
                </label>
                <input
                  type="text"
                  value={liveClassForm.meetingPassword || ""}
                  onChange={(e) => setLiveClassForm({ ...liveClassForm, meetingPassword: e.target.value })}
                  placeholder="e.g. TYSON2026"
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                  Student Instructions
                </label>
                <textarea
                  rows={3}
                  value={liveClassForm.instructions || ""}
                  onChange={(e) => setLiveClassForm({ ...liveClassForm, instructions: e.target.value })}
                  className="w-full text-xs px-3.5 py-2 rounded-xl bg-surface border border-line text-ink"
                />
              </div>

              <div className="pt-4 border-t border-line flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary text-xs px-4 py-2"
                >
                  {isPending ? "Saving..." : "Save Meeting Configuration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Telegram                                           */}
      {/* ========================================================= */}
      {activeModal === "telegram" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="card max-w-2xl w-full bg-surface border-line shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warm-cream/50 border border-line flex items-center justify-center p-2">
                  <TelegramChannelIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink font-display">Telegram VIP Community</h3>
                  <p className="text-xs text-ink-muted">Private broadcast channels & student chat groups</p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-ink-muted hover:text-ink text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTelegram} className="space-y-4 mt-5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                  Telegram Group / Channel Invite URL
                </label>
                <input
                  type="url"
                  value={telegramForm.channelUrl || ""}
                  onChange={(e) => setTelegramForm({ ...telegramForm, channelUrl: e.target.value })}
                  placeholder="https://t.me/+AbCdEfGhIjKlMnOp"
                  className="w-full text-xs font-mono px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                  Community Name
                </label>
                <input
                  type="text"
                  value={telegramForm.groupName || ""}
                  onChange={(e) => setTelegramForm({ ...telegramForm, groupName: e.target.value })}
                  placeholder="e.g. VIP Mastermind Community"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-surface border border-line text-ink"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={telegramForm.autoInviteOnPurchase}
                    onChange={(e) => setTelegramForm({ ...telegramForm, autoInviteOnPurchase: e.target.checked })}
                    className="rounded border-line text-brand focus:ring-brand"
                  />
                  <span className="text-xs font-semibold text-ink">
                    Display VIP Telegram invite badge prominently on order confirmation screens
                  </span>
                </label>
              </div>

              <div className="pt-4 border-t border-line flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary text-xs px-4 py-2"
                >
                  {isPending ? "Saving..." : "Save Telegram Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
