"use client";

import { useState, useTransition } from "react";
import type { CreatorPaymentGatewaysConfig } from "@/lib/integrations/types";
import { saveCreatorGatewaysAction, testGatewayConnectionAction } from "@/app/actions/creator-gateways";
import { JodoPayIcon, RazorpayIcon, EasebuzzIcon, LockIcon, ShieldCheckIcon } from "@/components/gateway-icons";

interface Props {
  initialConfig?: CreatorPaymentGatewaysConfig;
}

export function CreatorGatewaysConfigPanel({ initialConfig }: Props) {
  const [config, setConfig] = useState<CreatorPaymentGatewaysConfig>({
    jodo: {
      enabled: initialConfig?.jodo?.enabled ?? true,
      baseUrl: initialConfig?.jodo?.baseUrl || "https://ext.devtest1.jodopay.com",
      apiKey: initialConfig?.jodo?.apiKey || "81329eb5c322",
      apiSecret: initialConfig?.jodo?.apiSecret || "818a40d7-fc13-4480-9b7a-4fc6de2bd74a",
      authHeader: initialConfig?.jodo?.authHeader || "Basic ODEzMjllYjVjMzIyOjgxOGE0MGQ3LWZjMTMtNDQ4MC05YjdhLTRmYzZkZTJiZDc0YQ==",
    },
    razorpay: {
      enabled: initialConfig?.razorpay?.enabled ?? true,
      keyId: initialConfig?.razorpay?.keyId || "",
      keySecret: initialConfig?.razorpay?.keySecret || "",
      webhookSecret: initialConfig?.razorpay?.webhookSecret || "",
    },
    easebuzz: {
      enabled: initialConfig?.easebuzz?.enabled ?? true,
      key: initialConfig?.easebuzz?.key || "",
      salt: initialConfig?.easebuzz?.salt || "",
      env: initialConfig?.easebuzz?.env || "test",
    },
  });

  const [activeTab, setActiveTab] = useState<"jodo" | "razorpay" | "easebuzz">("jodo");
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  // Compute live Basic Auth for Jodo
  const computedJodoAuth = (() => {
    if (config.jodo.apiKey && config.jodo.apiSecret) {
      try {
        return `Basic ${btoa(`${config.jodo.apiKey.trim()}:${config.jodo.apiSecret.trim()}`)}`;
      } catch {
        return config.jodo.authHeader || "";
      }
    }
    return config.jodo.authHeader || "";
  })();

  const handleSave = () => {
    setToast(null);
    startSaving(async () => {
      const res = await saveCreatorGatewaysAction({
        ...config,
        jodo: {
          ...config.jodo,
          authHeader: computedJodoAuth,
        },
      });

      if (res.ok) {
        setToast({ text: "Payment gateway credentials saved successfully!", ok: true });
        if (res.data) setConfig(res.data);
      } else {
        setToast({ text: res.error || "Failed to save gateway settings", ok: false });
      }
      setTimeout(() => setToast(null), 5000);
    });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      let creds: Record<string, string> = {};
      if (activeTab === "jodo") {
        creds = {
          baseUrl: config.jodo.baseUrl || "https://ext.devtest1.jodopay.com",
          apiKey: config.jodo.apiKey || "",
          apiSecret: config.jodo.apiSecret || "",
          authHeader: computedJodoAuth,
        };
      } else if (activeTab === "razorpay") {
        creds = {
          keyId: config.razorpay.keyId || "",
          keySecret: config.razorpay.keySecret || "",
          webhookSecret: config.razorpay.webhookSecret || "",
        };
      } else if (activeTab === "easebuzz") {
        creds = {
          key: config.easebuzz.key || "",
          salt: config.easebuzz.salt || "",
          env: config.easebuzz.env || "test",
        };
      }

      const res = await testGatewayConnectionAction(activeTab, creds);
      setTestResult(res);
    } catch {
      setTestResult({ ok: false, message: "Network error during credentials test." });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="card p-6 sm:p-7 space-y-6 border-line bg-surface rounded-[24px] shadow-sm mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-brand text-[10px] font-extrabold uppercase tracking-widest">
              Creator Infrastructure
            </span>
            <span className="text-[10px] font-mono text-muted">Multi-Gateway Routing</span>
          </div>
          <h2 className="text-xl font-bold text-ink font-display mt-1">
            Payment Gateways Configuration
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Enable gateways and provide your merchant API Key &amp; Secret. Tysonpe handles automated order creation, hosted checkout redirect, and instant course unlock.
          </p>
        </div>

        {/* Global Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary btn-md flex items-center justify-center gap-2 shrink-0 active:scale-[0.98] transition-all duration-150 shadow-sm"
        >
          {isSaving ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Saving Changes…</span>
            </>
          ) : (
            <>
              <LockIcon className="w-4 h-4" />
              <span>Save Gateway Settings</span>
            </>
          )}
        </button>
      </div>

      {/* Feedback Toast */}
      {toast && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
            toast.ok
              ? "bg-good-soft text-good border border-good/20"
              : "bg-bad-soft text-bad border border-bad/20"
          }`}
        >
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-muted hover:text-ink text-sm px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Gateway Segmented Tab Switcher */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-surface-2 border border-line">
        {/* Jodo Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("jodo");
            setTestResult(null);
          }}
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-between gap-3 transition-all ${
            activeTab === "jodo"
              ? "bg-surface text-ink shadow-sm ring-1 ring-line"
              : "text-muted hover:text-ink hover:bg-surface/50"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#0C1B33] flex items-center justify-center shrink-0">
              <JodoPayIcon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="block font-bold">Jodo Pay</span>
              <span className="text-[10px] font-normal text-muted block">Direct API &amp; Hosted</span>
            </div>
          </div>
          <span
            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
              config.jodo.enabled
                ? "bg-good-soft text-good"
                : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {config.jodo.enabled ? "Active" : "Disabled"}
          </span>
        </button>

        {/* Razorpay Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("razorpay");
            setTestResult(null);
          }}
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-between gap-3 transition-all ${
            activeTab === "razorpay"
              ? "bg-surface text-ink shadow-sm ring-1 ring-line"
              : "text-muted hover:text-ink hover:bg-surface/50"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#0C2340] flex items-center justify-center shrink-0">
              <RazorpayIcon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="block font-bold">Razorpay</span>
              <span className="text-[10px] font-normal text-muted block">Standard Modal</span>
            </div>
          </div>
          <span
            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
              config.razorpay.enabled
                ? "bg-good-soft text-good"
                : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {config.razorpay.enabled ? "Active" : "Disabled"}
          </span>
        </button>

        {/* Easebuzz Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("easebuzz");
            setTestResult(null);
          }}
          className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-between gap-3 transition-all ${
            activeTab === "easebuzz"
              ? "bg-surface text-ink shadow-sm ring-1 ring-line"
              : "text-muted hover:text-ink hover:bg-surface/50"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-amber-500/15 flex items-center justify-center shrink-0">
              <EasebuzzIcon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="block font-bold">Easebuzz</span>
              <span className="text-[10px] font-normal text-muted block">Hosted Checkout</span>
            </div>
          </div>
          <span
            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
              config.easebuzz.enabled
                ? "bg-good-soft text-good"
                : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {config.easebuzz.enabled ? "Active" : "Disabled"}
          </span>
        </button>
      </div>

      {/* ======================= JODO PAY CONFIG ======================= */}
      {activeTab === "jodo" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Toggle Gateway */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-2 border border-line">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-ink">Enable Jodo Pay at Checkout</span>
              <p className="text-xs text-muted">
                Allow customers to pay via Jodo hosted payment link with UPI, Netbanking, and Cards.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.jodo.enabled}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    jodo: { ...prev.jodo, enabled: e.target.checked },
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand" />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* API Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink block uppercase tracking-wider">
                Jodo API Key
              </label>
              <input
                type="text"
                value={config.jodo.apiKey || ""}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    jodo: { ...prev.jodo, apiKey: e.target.value },
                  }))
                }
                placeholder="e.g. 81329eb5c322"
                className="input font-mono text-sm w-full"
              />
              <span className="text-[11px] text-muted block">
                Provided by Jodo merchant dashboard or onboarded rep.
              </span>
            </div>

            {/* API Secret */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ink block uppercase tracking-wider">
                  Jodo API Secret
                </label>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-[11px] text-brand hover:underline font-semibold"
                >
                  {showSecret ? "Hide Secret" : "Show Secret"}
                </button>
              </div>
              <input
                type={showSecret ? "text" : "password"}
                value={config.jodo.apiSecret || ""}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    jodo: { ...prev.jodo, apiSecret: e.target.value },
                  }))
                }
                placeholder="818a40d7-fc13-4480-9b7a-4fc6de2bd74a"
                className="input font-mono text-sm w-full"
              />
              <span className="text-[11px] text-muted block">
                Never shared publicly; stored safely in your encrypted creator config.
              </span>
            </div>
          </div>

          {/* Base URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink block uppercase tracking-wider">
              Jodo API Base URL
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={config.jodo.baseUrl || "https://ext.devtest1.jodopay.com"}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    jodo: { ...prev.jodo, baseUrl: e.target.value },
                  }))
                }
                placeholder="https://ext.devtest1.jodopay.com"
                className="input font-mono text-sm flex-1 min-w-[240px]"
              />
              <button
                type="button"
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    jodo: { ...prev.jodo, baseUrl: "https://ext.devtest1.jodopay.com" },
                  }))
                }
                className="btn btn-secondary btn-sm text-xs font-mono"
              >
                DevTest1 Sandbox
              </button>
              <button
                type="button"
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    jodo: { ...prev.jodo, baseUrl: "https://ext.jodopay.com" },
                  }))
                }
                className="btn btn-secondary btn-sm text-xs font-mono"
              >
                Production Live
              </button>
            </div>
            <span className="text-[11px] text-muted block">
              Default is DevTest1: <code className="text-ink">https://ext.devtest1.jodopay.com</code>
            </span>
          </div>

          {/* Auto-derived Authorization Header Callout */}
          <div className="p-3.5 rounded-xl bg-surface-2 border border-line text-xs space-y-1">
            <span className="font-bold text-ink text-[11px] uppercase tracking-wider block">
              Auto-Generated Basic Authorization Header
            </span>
            <code className="text-[11px] font-mono text-brand block break-all select-all bg-surface p-2 rounded-lg border border-line">
              {computedJodoAuth || "Basic [Enter Key & Secret]"}
            </code>
            <p className="text-[11px] text-muted">
              Tysonpe encodes your API Key &amp; Secret into standard HTTP Basic Auth for all <code className="font-mono">POST /orders</code> and <code className="font-mono">GET /orders</code> requests.
            </p>
          </div>

          {/* Connection Test & Quick Verification */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="btn btn-secondary btn-sm flex items-center gap-2 active:scale-[0.98] transition-all"
            >
              {isTesting ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                  <span>Pinging Jodo API…</span>
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="w-4 h-4 text-good" />
                  <span>Test Jodo Gateway Connection</span>
                </>
              )}
            </button>

            {testResult && (
              <span
                className={`text-xs font-semibold flex items-center gap-1.5 ${
                  testResult.ok ? "text-good" : "text-bad"
                }`}
              >
                <span>{testResult.ok ? "✓" : "⚠"}</span>
                <span>{testResult.message}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* ======================= RAZORPAY CONFIG ======================= */}
      {activeTab === "razorpay" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-2 border border-line">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-ink">Enable Razorpay at Checkout</span>
              <p className="text-xs text-muted">
                Displays the Razorpay modal overlay for UPI QR, Credit/Debit cards, Netbanking &amp; Wallets.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.razorpay.enabled}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    razorpay: { ...prev.razorpay, enabled: e.target.checked },
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand" />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink block uppercase tracking-wider">
                Razorpay Key ID
              </label>
              <input
                type="text"
                value={config.razorpay.keyId || ""}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    razorpay: { ...prev.razorpay, keyId: e.target.value },
                  }))
                }
                placeholder="rzp_test_... or rzp_live_..."
                className="input font-mono text-sm w-full"
              />
              <span className="text-[11px] text-muted block">
                Found under Razorpay Dashboard → Settings → API Keys.
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ink block uppercase tracking-wider">
                  Razorpay Key Secret
                </label>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-[11px] text-brand hover:underline font-semibold"
                >
                  {showSecret ? "Hide Secret" : "Show Secret"}
                </button>
              </div>
              <input
                type={showSecret ? "text" : "password"}
                value={config.razorpay.keySecret || ""}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    razorpay: { ...prev.razorpay, keySecret: e.target.value },
                  }))
                }
                placeholder="Generated alongside Key ID"
                className="input font-mono text-sm w-full"
              />
              <span className="text-[11px] text-muted block">
                Used to verify cryptographic payment signatures.
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink block uppercase tracking-wider">
              Webhook Secret (Optional)
            </label>
            <input
              type="text"
              value={config.razorpay.webhookSecret || ""}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  razorpay: { ...prev.razorpay, webhookSecret: e.target.value },
                }))
              }
              placeholder="e.g. whsec_..."
              className="input font-mono text-sm w-full"
            />
            <span className="text-[11px] text-muted block">
              Configured on Razorpay webhooks for instant background status updates.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="btn btn-secondary btn-sm flex items-center gap-2 active:scale-[0.98] transition-all"
            >
              {isTesting ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                  <span>Validating…</span>
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="w-4 h-4 text-good" />
                  <span>Validate Razorpay Keys</span>
                </>
              )}
            </button>

            {testResult && (
              <span
                className={`text-xs font-semibold flex items-center gap-1.5 ${
                  testResult.ok ? "text-good" : "text-bad"
                }`}
              >
                <span>{testResult.ok ? "✓" : "⚠"}</span>
                <span>{testResult.message}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* ======================= EASEBUZZ CONFIG ======================= */}
      {activeTab === "easebuzz" && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-2 border border-line">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-ink">Enable Easebuzz at Checkout</span>
              <p className="text-xs text-muted">
                Redirects buyers to Easebuzz hosted payment page with 15-minute order session.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.easebuzz.enabled}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    easebuzz: { ...prev.easebuzz, enabled: e.target.checked },
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand" />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink block uppercase tracking-wider">
                Merchant Key
              </label>
              <input
                type="text"
                value={config.easebuzz.key || ""}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    easebuzz: { ...prev.easebuzz, key: e.target.value },
                  }))
                }
                placeholder="e.g. 2PBP7IABZ2"
                className="input font-mono text-sm w-full"
              />
              <span className="text-[11px] text-muted block">
                Your Easebuzz merchant key identifier.
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ink block uppercase tracking-wider">
                  Merchant Salt
                </label>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-[11px] text-brand hover:underline font-semibold"
                >
                  {showSecret ? "Hide Salt" : "Show Salt"}
                </button>
              </div>
              <input
                type={showSecret ? "text" : "password"}
                value={config.easebuzz.salt || ""}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    easebuzz: { ...prev.easebuzz, salt: e.target.value },
                  }))
                }
                placeholder="DA00IB0EZU"
                className="input font-mono text-sm w-full"
              />
              <span className="text-[11px] text-muted block">
                Private salt used for SHA512 transaction hashes.
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-ink block uppercase tracking-wider">
              Environment
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="radio"
                  name="easebuzz-env"
                  value="test"
                  checked={config.easebuzz.env !== "prod"}
                  onChange={() =>
                    setConfig((prev) => ({
                      ...prev,
                      easebuzz: { ...prev.easebuzz, env: "test" },
                    }))
                  }
                  className="radio"
                />
                <span>Test Sandbox (<code className="text-ink">testpay.easebuzz.in</code>)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="radio"
                  name="easebuzz-env"
                  value="prod"
                  checked={config.easebuzz.env === "prod"}
                  onChange={() =>
                    setConfig((prev) => ({
                      ...prev,
                      easebuzz: { ...prev.easebuzz, env: "prod" },
                    }))
                  }
                  className="radio"
                />
                <span>Production Live (<code className="text-ink">pay.easebuzz.in</code>)</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="btn btn-secondary btn-sm flex items-center gap-2 active:scale-[0.98] transition-all"
            >
              {isTesting ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                  <span>Testing…</span>
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="w-4 h-4 text-good" />
                  <span>Verify Easebuzz Config</span>
                </>
              )}
            </button>

            {testResult && (
              <span
                className={`text-xs font-semibold flex items-center gap-1.5 ${
                  testResult.ok ? "text-good" : "text-bad"
                }`}
              >
                <span>{testResult.ok ? "✓" : "⚠"}</span>
                <span>{testResult.message}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
