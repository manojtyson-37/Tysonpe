export function UpiIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M14 6L28 24L14 42" stroke="#097939" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 6L36 24L22 42" stroke="#E65100" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GPayIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function PhonePeIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="36" height="36" rx="8" fill="#5F259F" />
      <path
        d="M25 14.5c0-.8-.7-1.5-1.5-1.5h-5.8v-3c0-.6-.4-1-1-1h-1.4c-.6 0-1 .4-1 1v3H12c-.6 0-1 .4-1 1v1.5c0 .6.4 1 1 1h2.3v10.5c0 .6.4 1 1 1h1.4c.6 0 1-.4 1-1v-4.8h1.8l3.6 5.5c.3.5.9.8 1.5.8h1.8c.8 0 1.3-.9.9-1.6l-3.8-5.6c1.6-.7 2.5-2.2 2.5-3.8zm-4.3 1.5c0 .6-.4 1-1 1h-2v-3.2h2c.6 0 1 .4 1 1v1.2z"
        fill="#ffffff"
      />
    </svg>
  );
}

export function PaytmIcon({ className = "w-7 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 72 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="72" height="24" rx="4" fill="#002E6E" />
      <text x="7" y="16.5" fill="#00BAF2" fontFamily="system-ui, -apple-system, sans-serif" fontSize="13" fontWeight="900" letterSpacing="0.5">
        Pay
      </text>
      <text x="36" y="16.5" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontSize="13" fontWeight="900" letterSpacing="0.5">
        tm
      </text>
    </svg>
  );
}

export function VisaIcon({ className = "w-8 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="24" rx="4" fill="#1A1F71" />
      <text x="9" y="16.5" fill="#FFFFFF" fontFamily="sans-serif" fontSize="13" fontWeight="bold" fontStyle="italic" letterSpacing="1">
        VISA
      </text>
    </svg>
  );
}

export function MastercardIcon({ className = "w-7 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="36" height="24" rx="4" fill="#222" />
      <circle cx="14" cy="12" r="7" fill="#EB001B" />
      <circle cx="22" cy="12" r="7" fill="#F79E1B" fillOpacity="0.85" />
    </svg>
  );
}

export function RupayIcon({ className = "w-8 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="48" height="24" rx="4" fill="#FFFFFF" stroke="#E2E8F0" />
      <path d="M12 18L18 6H24L18 18H12Z" fill="#097939" />
      <path d="M22 18L28 6H34L28 18H22Z" fill="#F37021" />
      <text x="14" y="16" fill="#1E293B" fontFamily="sans-serif" fontSize="9" fontWeight="900">
        RuPay
      </text>
    </svg>
  );
}

export function HdfcBankIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#004C8F" />
      <rect x="7" y="7" width="18" height="18" fill="#ED232A" />
      <rect x="11" y="11" width="10" height="10" fill="#004C8F" />
      <rect x="13.5" y="7" width="5" height="18" fill="#FFFFFF" />
      <rect x="7" y="13.5" width="18" height="5" fill="#FFFFFF" />
    </svg>
  );
}

export function SbiBankIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#280071" />
      <circle cx="16" cy="16" r="14" fill="#00A5DF" />
      <circle cx="16" cy="16" r="5" fill="#FFFFFF" />
      <rect x="14.5" y="16" width="3" height="10" fill="#FFFFFF" />
    </svg>
  );
}

export function IciciBankIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#B02A30" />
      <path d="M16 6C10.5 6 6 10.5 6 16C6 21.5 10.5 26 16 26C21.5 26 26 21.5 26 16" stroke="#F58220" strokeWidth="4" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3" fill="#F58220" />
    </svg>
  );
}

export function AxisBankIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#97144D" />
      <path d="M16 7L7 25H13L16 18L19 25H25L16 7Z" fill="#FFFFFF" />
      <path d="M16 14L13 20H19L16 14Z" fill="#97144D" />
    </svg>
  );
}

export function KotakBankIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#ED1C24" />
      <path d="M10 8V24M10 16L21 8M10 16L21 24" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function ShieldCheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function QrCodeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M10 3v4" />
      <path d="M3 10h4" />
      <path d="M14 10h.01" />
      <path d="M10 14h.01" />
      <path d="M10 17h.01" />
      <path d="M14 17h4" />
      <path d="M17 14v4" />
    </svg>
  );
}

export function CreditCardIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}

export function BankIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21h18M3 10h18M5 10v11M9 10v11M15 10v11M19 10v11M12 3 2 10h20L12 3z" />
    </svg>
  );
}

export function WalletIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 7v13a2 2 0 0 0 2 2h16v-5" />
      <circle cx="18" cy="15" r="1.5" />
    </svg>
  );
}

export function ClockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function CredIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="36" height="36" rx="8" fill="#121212" />
      <path
        d="M11 11h14v14H11V11zm2.5 2.5v9h9v-9h-9zm2.5 2.5h4v4h-4v-4z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function BhimIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="36" height="36" rx="8" fill="#005B94" />
      <path d="M12 9l8 9-8 9h5l8-9-8-9h-5z" fill="#00AEEF" />
      <path d="M18 9l8 9-8 9h5l8-9-8-9h-5z" fill="#F37023" />
    </svg>
  );
}

// Aliases for intuitive semantic naming
export const GooglePayIcon = GPayIcon;
export const BhimUpiIcon = BhimIcon;
export const ShieldCheckBadge = ShieldCheckIcon;
export const LockBadge = LockIcon;

export function GoogleSheetsIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M30 4H12C9.79 4 8 5.79 8 8v32c0 2.21 1.79 4 4 4h24c2.21 0 4-1.79 4-4V16L30 4z" fill="#0F9D58" />
      <path d="M30 4v12h12L30 4z" fill="#87CEAC" />
      <path d="M14 22h20v4H14v-4zm0 6h20v4H14v-4zm0 6h14v4H14v-4z" fill="#FFFFFF" fillOpacity="0.9" />
      <path d="M22 22v16m6-16v16" stroke="#0F9D58" strokeWidth="1.5" />
    </svg>
  );
}

export function DiscordIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.893.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
        fill="#5865F2"
      />
    </svg>
  );
}

export function SmsIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="14" y2="13" />
    </svg>
  );
}

export function EmailMarketingIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

export function MetaPixelIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M16.5 6C14.7 6 13.2 7 12 8.4 10.8 7 9.3 6 7.5 6 4.5 6 2 8.6 2 12s2.5 6 5.5 6c2.4 0 4.1-1.4 4.5-2 .4.6 2.1 2 4.5 2 3 0 5.5-2.7 5.5-6s-2.5-6-5.5-6zm-9 9.5c-1.8 0-3.3-1.6-3.3-3.5S5.7 8.5 7.5 8.5c1.4 0 2.5.8 3.3 2-1.3 2.1-2.4 5-3.3 5zm9 0c-.9 0-2-2.9-3.3-5 .8-1.2 1.9-2 3.3-2 1.8 0 3.3 1.6 3.3 3.5s-1.5 3.5-3.3 3.5z"
        fill="#0668E1"
      />
    </svg>
  );
}

export function CustomDomainIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function ZoomMeetingIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#2D8CFF" />
      <path
        d="M5 8.5C5 7.67 5.67 7 6.5 7h7c.83 0 1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5h-7c-.83 0-1.5-.67-1.5-1.5v-7zm11 2.25l3-2.25v7l-3-2.25v-2.5z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function TelegramChannelIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#229ED9" />
      <path
        d="M5.5 11.5l11-4.5c.5-.2 1 .1.9.7l-1.8 8.8c-.1.6-.6.8-1.1.5l-3-2.2-1.4 1.4c-.2.2-.3.3-.6.3l.2-3 5.5-5c.2-.2 0-.3-.3-.1l-6.8 4.3-2.9-.9c-.6-.2-.6-.6.1-.9z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function WebhookApiIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}


