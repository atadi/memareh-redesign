import type { NextConfig } from "next";
import { securityHeaders } from "@/lib/security-headers";

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
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
