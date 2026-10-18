"use client";

import Script from "next/script";
import type { TrackingPixelsConfig } from "@/lib/integrations/types";

export interface TrackingEvent {
  name: "InitiateCheckout" | "Purchase";
  valuePaise: number;
  orderId?: string;
  itemTitle?: string;
}

interface TrackingPixelsProps {
  config?: TrackingPixelsConfig | null;
  event?: TrackingEvent;
}

export function TrackingPixels({ config, event }: TrackingPixelsProps) {
  if (!config || config.enabled === false) return null;

  const { metaPixelId, googleAnalyticsId, gtmContainerId } = config;
  const valueINR = event ? (event.valuePaise / 100).toFixed(2) : "0.00";

  return (
    <>
      {/* Meta Pixel */}
      {metaPixelId && metaPixelId.trim() && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${metaPixelId.trim()}');
              fbq('track', 'PageView');
              ${
                event?.name === "Purchase"
                  ? `fbq('track', 'Purchase', { value: ${valueINR}, currency: 'INR' });`
                  : event?.name === "InitiateCheckout"
                  ? `fbq('track', 'InitiateCheckout', { value: ${valueINR}, currency: 'INR' });`
                  : ""
              }
            `}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${metaPixelId.trim()}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {/* Google Analytics 4 (GA4) */}
      {googleAnalyticsId && googleAnalyticsId.trim() && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId.trim()}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleAnalyticsId.trim()}', {
                page_path: window.location.pathname,
              });
              ${
                event?.name === "Purchase"
                  ? `gtag('event', 'purchase', {
                      transaction_id: '${event.orderId || ""}',
                      value: ${valueINR},
                      currency: 'INR',
                      items: [{ item_name: '${(event.itemTitle || "Product").replace(/'/g, "\\'")}' }]
                    });`
                  : event?.name === "InitiateCheckout"
                  ? `gtag('event', 'begin_checkout', {
                      value: ${valueINR},
                      currency: 'INR',
                      items: [{ item_name: '${(event.itemTitle || "Product").replace(/'/g, "\\'")}' }]
                    });`
                  : ""
              }
            `}
          </Script>
        </>
      )}

      {/* Google Tag Manager (GTM) */}
      {gtmContainerId && gtmContainerId.trim() && (
        <Script id="gtm-script" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmContainerId.trim()}');
          `}
        </Script>
      )}
    </>
  );
}
