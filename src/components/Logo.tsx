export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight ${className}`}>
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <rect width="26" height="26" rx="8" fill="var(--brand)" />
        <path d="M7 8.5h12M13 8.5V19" stroke="var(--brand-ink)" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="19.2" cy="17.8" r="2.1" fill="var(--accent)" />
      </svg>
      Tysonpe
    </span>
  );
}
