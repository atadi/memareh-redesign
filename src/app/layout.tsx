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
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        {/* Favicons are emitted by Next.js metadata; see buildRootMetadata in src/lib/seo.ts. */}

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
