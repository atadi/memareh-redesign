import { describe, it, expect, vi } from "vitest";
import { proxy as middleware } from "../src/proxy";

// Minimal NextRequest stub: only `nextUrl.pathname` is read by the middleware.
function makeRequest(pathname: string) {
  return { nextUrl: { pathname } } as unknown as Parameters<typeof middleware>[0];
}

describe("articles latency middleware", () => {
  it("adds x-start-time, x-route and x-duration-ms headers", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const response = middleware(makeRequest("/articles/dalile-ghate"));

    expect(response.headers.get("x-start-time")).toMatch(/^\d+$/);
    expect(response.headers.get("x-route")).toBe("/articles/dalile-ghate");
    expect(Number(response.headers.get("x-duration-ms"))).toBeGreaterThanOrEqual(0);
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  it("reflects the requested pathname on the x-route header", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const response = middleware(makeRequest("/articles/other-slug"));

    expect(response.headers.get("x-route")).toBe("/articles/other-slug");
    spy.mockRestore();
  });
});
