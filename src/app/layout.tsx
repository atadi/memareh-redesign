import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "معماره - خدمات برق‌کاری حرفه‌ای و مطمئن",
  description: "دسترسی سریع به بیش از ۵۰۰ تکنسین برق‌کار مجاز در سراسر کشور. خدمات اضطراری ۲۴ ساعته، نصب، تعمیر و نگهداری تاسیسات برقی با ضمانت کتبی.",
  keywords: ["برق‌کار", "خدمات برق‌کاری", "تکنسین برق", "نصب برق", "تعمیر برق", "سیم‌کشی", "معماره"],
  authors: [{ name: "معماره" }],
  creator: "معماره",
  publisher: "معماره",
  icons: {
    icon: [
      { url: "/assets/logo/fav-logo.png" },
      { url: "/assets/logo/fav-logo.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/logo/fav-logo.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/assets/logo/fav-logo.png" },
    ],
    shortcut: "/assets/logo/fav-logo.png",
  },
  openGraph: {
    title: "معماره - خدمات برق‌کاری حرفه‌ای",
    description: "دسترسی سریع به بیش از ۵۰۰ تکنسین برق‌کار مجاز در سراسر کشور",
    url: "https://memareh.com",
    siteName: "معماره",
    images: [
      {
        url: "/assets/logo/cover-image.jpg",
        width: 1200,
        height: 630,
        alt: "معماره - خدمات برق‌کاری",
      },
    ],
    locale: "fa_IR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "معماره - خدمات برق‌کاری حرفه‌ای",
    description: "دسترسی سریع به بیش از ۵۰۰ تکنسین برق‌کار مجاز",
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
  return (
    <html lang="fa" dir="rtl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
