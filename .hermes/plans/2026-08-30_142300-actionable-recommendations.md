# Actionable Recommendations Implementation Plan

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task‑by‑task.

**Goal:** Apply all high‑, medium‑ and low‑priority recommendations from the previous architectural/UI review to improve bundle size, code organization, performance, security, developer experience, and accessibility of the `memareh‑redesign` project.

**Architecture:** The project is a Next.js 16 application with TypeScript, Supabase as the backend, and Vercel for deployment. The plan refactors the layout, centralises Supabase initialization, adds a domain layer, introduces caching, builds a UI design system, enforces CI checks, and improves accessibility.

**Tech Stack:** Next.js 16, React, TypeScript, Tailwind CSS, Supabase (client & server), Vercel, ESLint, Prettier, Jest/React‑Testing‑Library, axe‑core for a11y, GitHub Actions.

---

## Priority‑Sliced Task List

### 🔥 High Priority (Must‑Do First)

#### Task 1 – Extract Layout‑Level Client Code
- **Objective:** Reduce the client‑side bundle by moving all always‑client components out of the server‑rendered `layout.tsx`.
- **Files:**
  - **Create:** `src/components/GlobalClient.tsx`
  - **Modify:** `src/app/layout.tsx`
- **Steps:**
  1. **Create `GlobalClient.tsx`** (client component) containing:
     ```tsx
     "use client";
     import { Toaster } from "react-hot-toast";
     import { ThemeProvider } from "@/components/ThemeProvider";
     import Script from "next/script";
     import { Analytics } from "@vercel/analytics/next";

     export default function GlobalClient({ children }: { children: React.ReactNode }) {
       const isProduction = process.env.NODE_ENV === "production";
       return (
         <>
           <Toaster position="top-center" />
           <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
             {children}
           </ThemeProvider>
           {isProduction && (
             <>
               <Script src="https://www.googletagmanager.com/gtag/js?id=G-EVR583NXGN" strategy="afterInteractive" />
               <Script id="google-analytics" strategy="afterInteractive">{`
                 window.dataLayer = window.dataLayer || [];
                 function gtag(){dataLayer.push(arguments);}
                 gtag('js', new Date());
                 gtag('set', 'allow_google_signals', false);
                 gtag('config', 'G-EVR583NXGN');
               `}</Script>
             </>
           )}
           <Analytics />
         </>
       );
     }
     ```
  2. **Update `src/app/layout.tsx`**:
     - Remove imports of `Toaster`, `ThemeProvider`, `Script`, `Analytics`.
     - Import and wrap `{children}` with `<GlobalClient>{children}</GlobalClient>`.
  3. **Verify:** Run `pnpm dev` and inspect the generated client bundle (e.g., via Chrome DevTools → Sources). Ensure layout‑level components are no longer in the initial server‑rendered HTML.
  4. **Commit:**
     ```bash
     git add src/components/GlobalClient.tsx src/app/layout.tsx
     git commit -m "refactor: extract always‑client code from layout"
     ```

#### Task 2 – Consolidate Supabase Initialization
- **Objective:** Prevent server‑only code from leaking into the client bundle and provide a single source of truth for Supabase clients.
- **Files:**
  - **Create:** `src/lib/supabase/factory.ts`
  - **Modify:** `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, any admin or public files that import directly from Supabase.
- **Steps:**
  1. **Factory implementation (`factory.ts`):**
     ```ts
     import { createClient as createBrowserClient } from "@supabase/supabase-js";
     import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";

     const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
     const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

     export const getPublicSupabase = () =>
       createBrowserClient(supabaseUrl, supabaseAnonKey);

     export const getServerSupabase = (ctx?: any) =>
       createServerSupabaseClient({ supabaseUrl, supabaseKey: supabaseAnonKey, ctx });
     ```
  2. **Replace old imports:**
     - In files like `src/lib/supabase/client.ts` replace direct `createClient` calls with `getPublicSupabase`.
     - In server‑side files (e.g., API routes, `src/app/api/revalidate/route.ts`) replace with `getServerSupabase`.
  3. **Update tests** to import from the factory.
  4. **Verification:** Add a unit test `tests/lib/supabase/factory.test.ts` that asserts the returned client has the correct URL and key.
  5. **Commit:**
     ```bash
     git add src/lib/supabase/factory.ts src/lib/supabase/*.ts tests/lib/supabase/factory.test.ts
     git commit -m "refactor: centralise Supabase client creation"
     ```

#### Task 3 – Enforce CI Linting & No‑jsdom Check
- **Objective:** Prevent regression of the jsdom‑related crash and keep code style consistent.
- **Files:**
  - **Create:** `.github/workflows/ci.yml`
  - **Create/Update:** `eslint.config.js` (if missing) and `prettier.config.cjs`.
- **Steps:**
  1. **CI workflow (`ci.yml`):**
     ```yaml
     name: CI
     on: [push, pull_request]

     jobs:
       build:
         runs-on: ubuntu-latest
         steps:
           - uses: actions/checkout@v4
           - name: Set up Node
             uses: actions/setup-node@v4
             with:
               node-version: '20'
               cache: 'pnpm'
           - name: Install dependencies
             run: pnpm install --frozen-lockfile
           - name: Lint
             run: pnpm lint
           - name: Unit Tests
             run: pnpm test:unit
           - name: No‑jsdom Check
             run: node scripts/check-no-jsdom.cjs
     ```
  2. **ESLint config (if absent):** Add a basic config enabling `@typescript-eslint` and `next` rules.
  3. **Prettier config:** Ensure consistent formatting.
  4. **Verification:** Push a test branch, confirm the workflow runs and fails when `scripts/check-no-jsdom.cjs` finds a reference.
  5. **Commit:**
     ```bash
     git add .github/workflows/ci.yml eslint.config.js prettier.config.cjs
     git commit -m "ci: add lint + no‑jsdom CI workflow"
     ```

---

### 📚 Medium Priority (Important Enhancements)

#### Task 4 – Introduce Domain Layer
- **Objective:** Separate business logic from generic utilities for clearer boundaries.
- **Files:**
  - **Create:** `src/domain/articles/optimizer.ts`, `src/domain/articles/textIntegrity.ts`, `src/domain/articles/audit.ts`
  - **Modify:** Update imports in `src/lib/article-optimizer.ts`, `src/lib/article-text-integrity.ts`, `src/lib/article-audit.ts` to re‑export from the new domain files.
- **Steps:**
  1. Move the existing implementations *as‑is* into the new domain folder (preserve exports).
  2. Add barrel file `src/domain/articles/index.ts` exporting the three utilities.
  3. Update any consumer imports to `import { optimizeArticle } from "@/domain/articles"`.
  4. Run `pnpm test:unit` to ensure nothing broke.
  5. **Commit:**
     ```bash
     git add src/domain/articles/ src/lib/article-optimizer.ts src/lib/article-text-integrity.ts src/lib/article-audit.ts
     git commit -m "refactor: add domain layer for article logic"
     ```

#### Task 5 – Cache Article JSON in ISR
- **Objective:** Reduce Supabase round‑trips during ISR regeneration.
- **Files:** `src/app/articles/[slug]/page.tsx`
- **Steps:**
  1. Import `unstable_cache` from `next/cache`.
  2. Wrap the Supabase fetch inside `unstable_cache` with a key based on the slug:
     ```ts
     const fetchArticle = unstable_cache(async (slug: string) => {
       const supabase = getServerSupabase();
       const { data, error } = await supabase.from("articles").select("*").eq("slug", slug).single();
       if (error) throw error;
       return data;
     }, [slug]);
     ```
  3. Replace direct fetch calls with `await fetchArticle(params.slug)`.
  4. **Verification:** Run `pnpm run build && pnpm start` and confirm no Supabase request appears in server logs for regenerated pages (use `VERCEL_DEBUG=1` if needed).
  5. **Commit:**
     ```bash
     git add src/app/articles/[slug]/page.tsx
     git commit -m "perf: cache article fetch in ISR via unstable_cache"
     ```

#### Task 6 – Accessibility Audit & ARIA Fixes
- **Objective:** Meet WCAG 2.1 AA for key interactive components.
- **Files:** `src/components/ui/Menu.tsx`, `src/components/articles/ArticleRating.tsx`, `src/components/articles/ArticleContent.tsx` (where clickable links are rendered).
- **Steps:**
  1. Add `role="menu"` and `aria-label` to `Menu`.
  2. Ensure each `MenuItem` has `role="menuitem"` and proper keyboard handling (`onKeyDown` for Enter/Space).
  3. In `ArticleRating`, add `aria-live="polite"` to convey rating changes.
  4. Install `jest-axe` and write tests under `tests/accessibility/menu.test.tsx`:
     ```ts
     import { render } from "@testing-library/react";
     import { axe } from "jest-axe";
     import Menu from "@/components/ui/Menu";

     test('Menu is accessible', async () => {
       const { container } = render(<Menu />);
       const results = await axe(container);
       expect(results).toHaveNoViolations();
     });
     ```
  5. Run `pnpm test:unit` and confirm zero violations.
  6. **Commit:**
     ```bash
     git add src/components/ui/Menu.tsx src/components/articles/ArticleRating.tsx tests/accessibility/menu.test.tsx
     git commit -m "accessibility: add ARIA roles and axe tests"
     ```

#### Task 7 – UI Design System (Buttons, Inputs, Modal)
- **Objective:** Provide reusable, styled primitives to avoid UI drift.
- **Files:**
  - **Create:** `src/components/ui/Button.tsx`, `src/components/ui/Input.tsx`, `src/components/ui/Modal.tsx`
  - **Modify:** Update usages in `src/components/ui/Menu.tsx`, `src/components/articles/ArticleEditor.tsx`, etc.
- **Steps:**
  1. Implement `Button` with Tailwind variants (`primary`, `secondary`, `danger`).
  2. Implement `Input` that forwards refs and supports error states.
  3. Implement simple `Modal` using `react-aria` or a custom portal.
  4. Replace existing `<button>` and `<input>` elements with the new components.
  5. Add component tests under `tests/ui/Button.test.tsx` verifying rendered classes and click handling.
  6. Run `pnpm test:unit`.
  7. **Commit:**
     ```bash
     git add src/components/ui/Button.tsx src/components/ui/Input.tsx src/components/ui/Modal.tsx src/components/**/**/*.tsx tests/ui/*.test.tsx
     git commit -m "ui: introduce design‑system primitives (Button, Input, Modal)"
     ```

#### Task 8 – Image Optimization with `next/image`
- **Objective:** Serve responsive, WebP‑converted images for better performance.
- **Files:** Identify all hard‑coded `<img>` tags (e.g., in `src/components/articles/ArticleContent.tsx` and any static hero components).
- **Steps:**
  1. Replace `<img src="/assets/..." .../>` with `<Image src="/assets/..." width={...} height={...} alt="..." />` imported from `next/image`.
  2. For Supabase‑hosted images, create a custom loader:
     ```ts
     const supabaseLoader = ({ src, width }) => `${src}?width=${width}`;
     ```
  3. Verify the generated HTML includes `srcset` and `loading="lazy"`.
  4. Run `pnpm build` and ensure no build errors.
  5. **Commit:**
     ```bash
     git add src/components/**/*.tsx
     git commit -m "perf: replace static img tags with next/image for optimisation"
     ```

#### Task 9 – Edge‑Runtime Observability Middleware
- **Objective:** Log request latency and route for quick debugging of ISR regeneration delays.
- **Files:** Create `src/middleware.ts`.
- **Steps:**
  1. Implement middleware that records `Date.now()` at request start, then logs duration after response:
     ```ts
     import { NextResponse } from "next/server";

     export function middleware(request) {
       const start = Date.now();
       const response = NextResponse.next();
       response.headers.set("x-start-time", `${start}`);
       response.headers.set("x-route", request.nextUrl.pathname);
       response.headers.set("x-duration-ms", `${Date.now() - start}`);
       return response;
     }

     export const config = { matcher: "/articles/:path*" };
     ```
  2. Deploy and verify headers via `curl -I https://www.memareh.com/articles/example`.
  3. Add a unit test that asserts middleware adds the expected headers.
  4. **Commit:**
     ```bash
     git add src/middleware.ts tests/middleware.test.ts
     git commit -m "infra: edge middleware for request latency logging"
     ```

---

### 🐢 Low Priority (Nice‑to‑Have)

#### Task 10 – Feature Flags
- **Create:** `src/lib/flags.ts` exposing `isEnabled(flag: string): boolean` (reads from environment variables).
- **Use:** Guard experimental UI like the new Modal.
- **Test:** Simple unit test checking boolean return.

#### Task 11 – Documentation
- **Create/Update:** `docs/setup.md` with steps to run the project locally, configure Supabase via MCP, and run the CI workflow.
- **Update:** Top‑level `README.md` with badges for CI status and coverage.
- **Add:** Contribution guidelines.

---

## Validation & Testing Strategy

1. **Unit Tests:** All new/modified code must have corresponding Jest tests (`*.test.tsx` or `*.test.ts`). Run `pnpm test:unit` after each task.
2. **Integration Tests:** For ISR caching and Supabase factory, add end‑to‑end tests under `tests/integration/` that spin up a preview server (`pnpm start`) and make HTTP requests with `node-fetch`.
3. **Accessibility Tests:** Use `jest-axe` on every interactive component.
4. **CI Enforcement:** The GitHub Actions workflow will block any push that fails lint, unit tests, or the `check-no-jsdom.cjs` script.
5. **Manual Smoke Test:** After the high‑priority tasks, run `pnpm run build && pnpm start` and manually verify:
   - No `ERR_REQUIRE_ESM` in server logs.
   - Bundle size reduction (inspect `/.next/static/chunks/pages/_app.js`).
   - Pages load with correct SEO meta.
   - Images served via `next/image`.

---

## Risks, Trade‑offs & Open Questions

- **Risk:** Refactoring Supabase init may temporarily break runtime code if any file still imports the old client. Mitigation: Run the full test suite after each file change.
- **Trade‑off:** Adding a design system introduces additional abstraction; ensure the learning curve is documented.
- **Open Question:** Should we adopt a CSS‑in‑JS solution (e.g., `styled‑components`) for the design system, or keep Tailwind utility‑first? Recommendation: stay with Tailwind for consistency.
- **MCP Access:** Since we have full MCP access to Supabase, we can create a temporary **read‑only** service role to be used by the `factory.ts` unit tests, ensuring no production data is mutated.

---

## Execution Hand‑off

The plan has been saved at:

```
.hermes/plans/2026-08-30_142300-actionable-recommendations.md
```

Ready to proceed with implementation using the `subagent-driven-development` skill, dispatching a sub‑agent per task with spec‑compliance and code‑quality reviews.
