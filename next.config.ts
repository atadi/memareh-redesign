import type { NextConfig } from "next";
import { securityHeaders, devSecurityHeaders } from "@/lib/security-headers";

const SUPABASE_HOST = "uakvurskrcyvksxfvhho.supabase.co";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: SUPABASE_HOST,
        pathname: "/**",
      },
    ],
  },
  async headers() {
    // The enforced (strict, no unsafe-eval) CSP is for production only. In dev,
    // Next.js webpack React Refresh HMR uses eval(), which a strict CSP blocks
    // and surfaces as an Uncaught EvalError that crashes the client bundle
    // (menu/login/hero then appear "missing"). Use a relaxed dev CSP so the
    // local dev server works; production keeps the hardened policy.
    const headers = process.env.NODE_ENV === "production" ? securityHeaders : devSecurityHeaders;
    return [
      {
        source: "/:path*",
        headers,
      },
    ];
  },
};

export default nextConfig;
