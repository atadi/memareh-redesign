// Centralized security-header definitions (SEC-02). Imported by next.config.ts
// so the policy is testable without booting Next.js.

const SUPABASE_HOST = "uakvurskrcyvksxfvhho.supabase.co";

// CSP maturity: ENFORCED but PARTIAL. `script-src`/`style-src` require
// `'unsafe-inline'` because Next.js App Router emits inline hydration scripts and
// the Google Analytics tag is an inline <Script>. A true strict CSP would need a
// nonce-based architecture change (out of scope). High-risk directives
// (object/iframe/frame-ancestors/base/form) are fully locked. DOM XSS is handled
// separately at the content-render boundary (SEC-01).
export const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://va.vercel-scripts.com`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: https://${SUPABASE_HOST} https://api.dicebear.com https://www.google-analytics.com`,
  `font-src 'self' data:`,
  `connect-src 'self' https://${SUPABASE_HOST} https://www.google-analytics.com https://region1.google-analytics.com https://va.vercel-scripts.com`,
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
