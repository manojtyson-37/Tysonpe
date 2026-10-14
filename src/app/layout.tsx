import type { Metadata } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({ variable: "--font-sans-var", subsets: ["latin"] });
const display = Bricolage_Grotesque({ variable: "--font-display-var", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Tysonpe — sell courses, memberships & live sessions", template: "%s · Tysonpe" },
  description:
    "Tysonpe is the creator commerce platform for India: storefront, UPI checkout, GST invoices, coupons and learner library in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
