// Centralized security-header definitions (SEC-02). Imported by next.config.ts
// so the policy is testable without booting Next.js.

const SUPABASE_HOST = "uakvurskrcyvksxfvhho.supabase.co";

// CSP maturity: ENFORCED but PARTIAL. `script-src`/`style-src` require
// `'unsafe-inline'` because Next.js App Router emits inline hydration scripts and
// the Google Analytics tag is an inline <Script>. A true strict CSP would need a
// nonce-based architecture change (out of scope). High-risk directives
// (object/iframe/frame-ancestors/base/form) are fully locked. DOM XSS is handled
// separately at the content-render boundary (SEC-01).
//
// GA4 CSP scope (Google's official guidance): basic measurement needs the
// google-analytics.com and analytics.google.com collect endpoints plus the
// googletagmanager bootstrap. Advertising-feature destinations (e.g.
// google.<cc>/ads/ga-audiences, doubleclick) are intentionally NOT allowed;
// instead GA's google signals are disabled in the tag config (see layout.tsx),
// which suppresses those requests entirely rather than widening CSP.
export const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: https://${SUPABASE_HOST} https://api.dicebear.com https://www.google-analytics.com https://*.google-analytics.com`,
  `font-src 'self' data:`,
  `connect-src 'self' https://${SUPABASE_HOST} https://*.google-analytics.com https://*.analytics.google.com https://va.vercel-scripts.com`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
].join("; ");

export const securityHeaders: { key: string; value: string }[] = [
  { key: "Content-Security-Policy", value: csp },
  // 2 years; no includeSubDomains/preload yet (domain/subdomain behavior not
  // fully verified — conservative per SEC hardening guidance).
  { key: "Strict-Transport-Security", value: "max-age=63072000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];
