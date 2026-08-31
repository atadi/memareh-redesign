"use client";

import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/ThemeProvider";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import Menu from "@/components/ui/Menu";
import { EmergencyBanner } from "@/components/home/EmergencyBanner";

/**
 * GlobalClient wraps the whole app with components that must run on the client side.
 * It isolates them from the server‑rendered layout, reducing the initial server bundle.
 */
export default function GlobalClient({ children }: { children: React.ReactNode }) {
  const isProduction = process.env.NODE_ENV === "production";
  return (
    <> 
      <Toaster position="top-center" />
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        {/* Top bar: EmergencyBanner scrolls away; the Menu stays sticky. */}
        <EmergencyBanner />
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur shadow-sm dark:bg-gray-900/95">
          <div className="container mx-auto px-2 py-2">
            <Menu />
          </div>
        </header>
        {children}
      </ThemeProvider>
      {isProduction && (
        <>
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-EVR583NXGN"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('set', 'allow_google_signals', false);
              gtag('config', 'G-EVR583NXGN');
            `}
          </Script>
          <Analytics />
        </>
      )}
    </>
  );
}
