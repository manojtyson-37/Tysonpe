"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LazyMotion, MotionConfig, domAnimation, m } from "framer-motion";
import {
  GooglePayIcon,
  PhonePeIcon,
  PaytmIcon,
  BhimUpiIcon,
  RupayIcon,
} from "./gateway-icons";

const MotionLink = m.create(Link);

export function AuroraHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  // Looped autoplay motion must stop for users who asked for reduced motion, and any user can pause it (WCAG 2.2.2).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    const sync = () => {
      if (mq.matches) v.pause();
      else void v.play().catch(() => {});
    };
    sync();
    mq.addEventListener("change", sync);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      mq.removeEventListener("change", sync);
    };
  }, []);

  const togglePlayback = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
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
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <section className="relative w-full h-svh min-h-[680px] max-h-[960px] overflow-hidden bg-black text-white">
          {/* Background video: decorative, muted, pausable. Poster covers blocked autoplay (low-power mode, data saver). */}
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            src="/hero.mp4"
            poster="/hero-poster.jpg"
            aria-hidden="true"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
          />

          <div className="absolute inset-0 bg-black/25 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent via-50% to-[#08090d] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 via-45% to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col justify-start h-full px-6 pt-20 sm:px-12 sm:pt-24 lg:pl-16 lg:pt-[14vh] max-w-5xl">
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-4 py-1.5 text-xs text-white/90 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <strong className="font-semibold text-white">Test-mode beta</strong>
              <span className="text-white/60">· no real money moves</span>
            </p>

            {/* Headline, copy and CTAs render visible in the server HTML: they are the LCP content. */}
            <h1
              style={{ fontSize: "clamp(2.4rem, 5vw, 4.2rem)", lineHeight: 1.06 }}
              className="mt-4 max-w-2xl font-semibold text-white drop-shadow-md"
            >
              Monetize Your Craft.
              <br />
              <span className="text-white/95">Zero Checkout Friction.</span>
            </h1>

            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/85 drop-shadow-sm sm:text-base">
              Launch a branded creator store. Take payments via UPI QR, Google Pay, PhonePe and cards, with numbered
              GST tax invoices, course delivery and a payout ledger. Payments run in test mode.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3.5">
              <MotionLink
                href="/signup?role=creator"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="rounded-full bg-white px-7 py-3.5 text-sm font-bold text-black shadow-2xl hover:bg-white/95"
              >
                Start Selling Free
              </MotionLink>

              <m.a
                href="#sandbox-demo"
                onClick={scrollToDemo}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="rounded-full border border-white/25 bg-black/60 px-5 py-3.5 text-sm font-semibold text-white shadow-md backdrop-blur-md hover:bg-black/80"
              >
                Live Gateway Sandbox
              </m.a>
            </div>
          </div>

          <div className="absolute bottom-6 left-6 z-20 flex flex-wrap items-center gap-3 text-xs text-white/70 sm:left-12 lg:left-16">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3.5 py-1.5 backdrop-blur-md">
              <span className="font-semibold text-white">UPI &amp; card checkout</span>
              <span className="text-white/40">·</span>
              <span className="font-mono font-bold text-emerald-400">Test mode</span>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3.5 py-1.5 backdrop-blur-md sm:flex">
              <span className="font-semibold text-white">Payout ledger</span>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3.5 py-1.5 backdrop-blur-md md:flex">
              <span className="font-semibold text-white">GST invoices · SAC 999293</span>
            </div>
            <div aria-hidden="true" className="flex items-center gap-2.5 pl-2 opacity-85">
              <GooglePayIcon className="h-4 w-7 text-white" />
              <PhonePeIcon className="h-4 w-7 text-white" />
              <PaytmIcon className="h-4 w-7 text-white" />
              <BhimUpiIcon className="h-4 w-7 text-white" />
              <RupayIcon className="h-3.5 w-6 text-white" />
            </div>
          </div>

          <button
            type="button"
            onClick={togglePlayback}
            aria-label={playing ? "Pause background video" : "Play background video"}
            className="absolute bottom-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white backdrop-blur-md transition-all duration-150 hover:bg-black/70 active:scale-[0.98] sm:right-12"
          >
            {playing ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </section>
      </MotionConfig>
    </LazyMotion>
  );
}
