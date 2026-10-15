"use client";

import { useEffect, useRef } from "react";
import { MotionConfig, motion } from "framer-motion";
import {
  GooglePayIcon,
  PhonePeIcon,
  PaytmIcon,
  BhimUpiIcon,
  RupayIcon,
} from "./gateway-icons";

export function AuroraHero() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Autoplaying looped motion must not run for users who asked for reduced motion.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      const v = videoRef.current;
      if (!v) return;
      if (mq.matches) v.pause();
      else void v.play().catch(() => {});
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const scrollToDemo = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("sandbox-demo");
    if (el) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    }
  };

  return (
    <MotionConfig reducedMotion="user">
    <section className="relative w-full h-svh min-h-[680px] max-h-[960px] overflow-hidden bg-black text-white">
      {/* Background Hero Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src="/hero.mp4"
        aria-hidden="true"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        disablePictureInPicture
      />

      {/* Layered Cinematic Overlays matching Aurora specifications */}
      <div className="absolute inset-0 bg-black/25 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent via-50% to-[#08090d] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 via-45% to-transparent pointer-events-none" />
      <div
        className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1100px] h-[750px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(16, 185, 129, 0.16) 0%, transparent 68%)",
        }}
      />

      {/* Asymmetric Content Container (Anchored Left) */}
      <div className="relative z-10 flex flex-col justify-start h-full px-6 pt-20 sm:px-12 sm:pt-24 lg:pl-16 lg:pt-[14vh] max-w-5xl">
        {/* Trusted By Avatar Stack Pill */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease: "easeOut" }}
          className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.08] px-4 py-1.5 backdrop-blur-md shadow-lg w-fit"
        >
          <div className="flex -space-x-2">
            {[
              { initials: "AR", name: "Asha Rao" },
              { initials: "VV", name: "Vikramaditya" },
              { initials: "NS", name: "Dr. Neha" },
            ].map((creator) => (
              <div
                key={creator.name}
                className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white border-2 border-black/80 shadow-xs"
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
                }}
              >
                {creator.initials}
              </div>
            ))}
          </div>
          <span className="text-xs text-white/90 font-sans">
            Trusted by{" "}
            <strong className="font-semibold text-white">2,400+ creators & educators</strong> across India
          </span>
        </motion.div>

        {/* Commanding Display Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: "easeOut" }}
          style={{
            fontFamily: "var(--font-sans), 'Plus Jakarta Sans', sans-serif",
            fontWeight: 600,
            fontSize: "clamp(2.4rem, 5vw, 4.2rem)",
            lineHeight: 1.06,
            letterSpacing: "-0.025em",
          }}
          className="mt-4 text-white max-w-2xl drop-shadow-md"
        >
          Monetize Your Craft.<br />
          <span className="text-white/95">Zero Checkout Friction.</span>
        </motion.h1>

        {/* Lead Paragraph */}
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18, ease: "easeOut" }}
          className="mt-3 max-w-lg text-sm sm:text-base leading-relaxed text-white/85 font-sans drop-shadow-sm"
        >
          Launch your branded creator store in 5 minutes. Accept instant payments via UPI QR, Google Pay, PhonePe, and cards with automated GST tax invoices, course delivery, and T+1 direct bank payouts.
        </motion.p>

        {/* CTA Group: White Pill + Circular Play Button + Glass Secondary Pill */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.24, ease: "easeOut" }}
          className="mt-6 flex flex-wrap items-center gap-3.5"
        >
          <motion.a
            href="/signup?role=creator"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-full bg-white px-7 py-3.5 text-sm font-bold text-black shadow-2xl hover:bg-white/95 active:scale-[0.98] transition-all"
          >
            Start Selling Free
          </motion.a>

          <motion.a
            href="#sandbox-demo"
            onClick={scrollToDemo}
            aria-label="Watch interactive checkout demo"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-white/20 text-white backdrop-blur-md hover:bg-white/30 active:scale-[0.95] transition-all shadow-lg"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff" className="translate-x-[1px]">
              <path d="M8 5v14l11-7z" />
            </svg>
          </motion.a>

          <motion.a
            href="#sandbox-demo"
            onClick={scrollToDemo}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-full border border-white/25 bg-black/60 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-md hover:bg-black/80 active:scale-[0.98] transition-all shadow-md"
          >
            Live Gateway Sandbox
          </motion.a>
        </motion.div>
      </div>

      {/* Pinned Bottom-Left Status & Trust Bar */}
      <div className="absolute bottom-6 left-6 sm:left-12 lg:left-16 z-20 flex flex-wrap items-center gap-3 text-xs text-white/70">
        <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3.5 py-1.5 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="font-semibold text-white">NPCI UPI 2.0 Rail</span>
          <span className="text-white/40">·</span>
          <span className="text-emerald-400 font-mono font-bold">99.4% Success</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3.5 py-1.5 backdrop-blur-md">
          <span className="font-semibold text-white">T+1 Direct Bank Deposit</span>
        </div>

        <div className="hidden md:flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3.5 py-1.5 backdrop-blur-md">
          <span className="font-semibold text-white">Automated SAC 999293 GST</span>
        </div>

        <div className="flex items-center gap-2.5 pl-2 opacity-85">
          <GooglePayIcon className="h-4 w-7 text-white" />
          <PhonePeIcon className="h-4 w-7 text-white" />
          <PaytmIcon className="h-4 w-7 text-white" />
          <BhimUpiIcon className="h-4 w-7 text-white" />
          <RupayIcon className="h-3.5 w-6 text-white" />
        </div>
      </div>
    </section>
    </MotionConfig>
  );
}
