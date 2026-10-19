"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { JodoPayIcon } from "@/components/gateway-icons";
import { initiateJodoPaymentAction } from "@/app/actions/jodo-payment";

interface ProductOption {
  id: string;
  title: string;
  pricePaise: number;
  creatorName: string;
  creatorId: string;
}

export function JodoPaymentForm({
  products,
  defaultCreatorId,
}: {
  products: ProductOption[];
  defaultCreatorId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedProductId, setSelectedProductId] = useState<string>(
    products[0]?.id || ""
  );

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const [name, setName] = useState("Ron Rivest");
  const [phone, setPhone] = useState("9876543210");
  const [email, setEmail] = useState("customer@example.com");
  const [amountRupees, setAmountRupees] = useState<number>(
    selectedProduct ? Math.round(selectedProduct.pricePaise / 100) : 100
  );
  const [error, setError] = useState<string | null>(null);

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const p = products.find((item) => item.id === productId);
    if (p) {
      setAmountRupees(Math.max(1, Math.round(p.pricePaise / 100)));
    }
  };

  const handleFillDemo = () => {
    setName("Ron Rivest");
    setPhone("9876543210");
    setEmail("customer@example.com");
    if (selectedProduct) {
      setAmountRupees(Math.max(1, Math.round(selectedProduct.pricePaise / 100)));
    } else {
      setAmountRupees(100);
    }
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    fd.set("productId", selectedProductId);
    fd.set("amount", String(amountRupees));
    fd.set("creatorId", selectedProduct?.creatorId || defaultCreatorId || "");

    startTransition(async () => {
      const res = await initiateJodoPaymentAction(null, fd);
      if (!res.ok) {
        setError(res.error || "Failed to initiate payment. Please try again.");
      } else if (res.redirectUrl) {
        // Redirect directly to Jodo's hosted payment page
        window.location.href = res.redirectUrl;
      }
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Course / Program Selection */}
        {products.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Select Program / Course
            </label>
            <div className="grid gap-2">
              {products.map((p) => {
                const isSelected = p.id === selectedProductId;
                const priceInInr = Math.round(p.pricePaise / 100);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProductChange(p.id)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? "border-brand bg-brand/5 shadow-2xs text-ink"
                        : "border-line bg-surface hover:bg-surface-2/60 text-muted"
                    }`}
                  >
                    <div>
                      <p className={`text-sm font-bold ${isSelected ? "text-ink" : "text-ink/80"}`}>
                        {p.title}
                      </p>
                      <p className="text-xs text-muted">Instructor: {p.creatorName}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-ink tabular-nums">
                        ₹{priceInInr.toLocaleString("en-IN")}
                      </span>
                      <span className="block text-[10px] text-muted">incl. 18% GST</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Payer Name */}
        <div className="space-y-1.5">
          <label htmlFor="payer-name" className="text-xs font-semibold uppercase tracking-wider text-muted">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="payer-name"
            name="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ron Rivest"
            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
          />
        </div>

        {/* Mobile & Email in 2 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="payer-phone" className="text-xs font-semibold uppercase tracking-wider text-muted">
              Mobile Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">
                +91
              </span>
              <input
                id="payer-phone"
                name="phone"
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="9876543210"
                className="w-full pl-11 pr-3.5 py-2.5 rounded-xl border border-line bg-surface text-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all tabular-nums font-mono"
              />
            </div>
            <p className="text-[11px] text-muted">For SMS notifications & receipt</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="payer-email" className="text-xs font-semibold uppercase tracking-wider text-muted">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              id="payer-email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-ink text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
            />
            <p className="text-[11px] text-muted">Course access sent here</p>
          </div>
        </div>

        {/* Amount in Rupees */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="payer-amount" className="text-xs font-semibold uppercase tracking-wider text-muted">
              Payable Amount (₹ INR) <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md dark:bg-emerald-950/40 dark:text-emerald-400">
              Zero platform surcharge
            </span>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-ink">
              ₹
            </span>
            <input
              id="payer-amount"
              name="amount"
              type="number"
              min={1}
              step={1}
              required
              value={amountRupees}
              onChange={(e) => setAmountRupees(Number(e.target.value))}
              className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-line bg-surface text-ink text-base font-extrabold focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all tabular-nums"
            />
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-bad-soft border border-rose-300/60 text-bad text-xs font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Submit Pay Now Button */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3.5 px-4 rounded-xl bg-ink text-surface font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all duration-150 cursor-pointer shadow-md disabled:opacity-60"
        >
          {isPending ? (
            <>
              <svg className="animate-spin h-4 w-4 text-surface" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Connecting to Jodo Pay Gateway…</span>
            </>
          ) : (
            <>
              <JodoPayIcon className="w-5 h-5 shrink-0" />
              <span>Pay ₹{amountRupees.toLocaleString("en-IN")} via Jodo Pay</span>
              <span className="text-surface/60">→</span>
            </>
          )}
        </button>
      </form>

      {/* Demo autofill and test details */}
      <div className="pt-4 border-t border-line/70 flex items-center justify-between text-xs text-muted">
        <span>Testing with partner sandbox?</span>
        <button
          type="button"
          onClick={handleFillDemo}
          className="font-semibold text-brand hover:underline cursor-pointer"
        >
          Autofill Test Data
        </button>
      </div>
    </div>
  );
}
