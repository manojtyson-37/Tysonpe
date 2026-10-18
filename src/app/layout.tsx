import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans-var",
  subsets: ["latin"],
});

const display = Bricolage_Grotesque({
  variable: "--font-display-var",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono-var",
  subsets: ["latin"],
});

const TITLE = "Tysonpe — sell courses, memberships & live sessions";
const DESCRIPTION =
  "Tysonpe is the creator commerce platform for India: storefront, UPI checkout, GST invoices, coupons and learner library in one place.";

// No share image on purpose: there is no real artwork yet, and a placeholder would be an invented asset.
export const metadata: Metadata = {
  title: { default: TITLE, template: "%s · Tysonpe" },
  description: DESCRIPTION,
  openGraph: { type: "website", siteName: "Tysonpe", locale: "en_IN", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

// Next 16 reads themeColor from `viewport`, not `metadata`. Matches the light canvas (--paper).
export const viewport: Viewport = { themeColor: "#fbfaf7" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
