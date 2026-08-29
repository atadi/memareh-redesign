import type { Metadata } from "next/types";
import { Geist, Geist_Mono } from "next/font/google";
import GlobalClient from "@/components/GlobalClient";
import "./globals.css";
import { getSiteUrl } from "@/lib/config";
import { SiteStructuredData } from "@/components/SiteStructuredData";
import { buildRootMetadata } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = buildRootMetadata(getSiteUrl());

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/assets/logo/favicon-32x32.png" />
        <link rel="icon" type="image/svg+xml" sizes="any" href="/assets/logo/favicon.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/assets/logo/apple-touch-icon.png" />

        {/* Analytics and Google Tag Manager are now handled in GlobalClient */}

        <SiteStructuredData />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GlobalClient>{children}</GlobalClient>
      </body>
    </html>
  );
}
