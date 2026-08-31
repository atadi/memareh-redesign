import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge proxy that measures request latency for `/articles/*` so ISR
 * regeneration delays are visible in logs and response headers.
 *
 * `NextResponse.next()` awaits the upstream route, so the delta between
 * `start` and its resolution is the real server-side render time.
 */
export function proxy(request: NextRequest) {
  const start = Date.now();
  const response = NextResponse.next();
  const durationMs = Date.now() - start;

  response.headers.set("x-start-time", `${start}`);
  response.headers.set("x-route", request.nextUrl.pathname);
  response.headers.set("x-duration-ms", `${durationMs}`);

  console.log(
    `[mw] ${request.nextUrl.pathname} ${durationMs}ms (articles latency probe)`,
  );

  return response;
}

export const config = {
  matcher: "/articles/:path*",
};
