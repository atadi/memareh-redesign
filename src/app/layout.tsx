import type { Metadata } from "next/types";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { ClientShell } from "@/components/ClientShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://memareh.com"),
  title: "معماره - خدمات برقکاری حرفه‌ای و مطمئن",
  description:
    "دسترسی سریع به تکنسین برقکار در تهران. خدمات اضطراری ۲۴ ساعته، نصب، تعمیر و نگهداری تاسیسات برقی با کیفیت و سرعت.",
  keywords: [
    "برقکار",
    "خدمات برقکاری",
    "تکنسین برق",
    "نصب برق",
    "تعمیر برق",
    "سیم‌کشی",
    "معماره",
  ],
  authors: [{ name: "معماره" }],
  creator: "معماره",
  publisher: "معماره",
  icons: {
    icon: [
      { url: "/assets/logo/favicon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/assets/logo/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/assets/logo/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/assets/logo/favicon.svg",
  },
  openGraph: {
    title: "معماره - خدمات برق‌کاری حرفه‌ای",
    description: "دسترسی سریع به تکنسین برقکار در سراسر تهران",
    url: "https://memareh.com",
    siteName: "معماره",
    images: [
      {
        url: "/assets/logo/cover-image.jpg",
        width: 1200,
        height: 630,
        alt: "معماره - خدمات برقکاری",
      },
    ],
    locale: "fa_IR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "معماره - خدمات برقکاری حرفه‌ای",
    description: "دسترسی سریع به تکنسین برقکار",
    images: ["/assets/logo/cover-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    // Add verification codes when available
    // google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isProduction = process.env.NODE_ENV === "production";

  return (
    <html lang="fa" dir="rtl">
      <head>
        {/* Google Analytics - Only in Production */}
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
                gtag('config', 'G-EVR583NXGN');
              `}
            </Script>
          </>
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Toaster position="top-center" />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <ClientShell>
            {children}
          </ClientShell>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
