# Services / Booking Schema Authority Audit (Phase B)

> Finding under audit: **ARCH-01 / DB-02 — P1** (`memareh.services` / `memareh.service_requests`
> referenced in code + types but absent in live production DB).
> Branch: `refactor/articles-schema-consolidation`, starting HEAD `4c6d99d`.
> Method: READ-ONLY discovery only. No CREATE/ALTER/INSERT/RLS/storage/auth changes.
> `public.articles` archive soak untouched.

## 1. Every repository reference

| File | Symbol | Kind | Type used | Notes |
|------|--------|------|-----------|-------|
| `src/app/booking/page.tsx` | `BookingPage` | Route entry | — | Body is only `redirect('/articles')`. |
| `src/app/booking/success/page.tsx` | `BookingSuccessPage` | Route entry | — | Body is only `redirect('/articles')`. |
| `src/hooks/useServices.ts` | `useServices`, `useServiceById` | Client hook | `Service` | Queries `.from('services')`. **No callers.** |
| `src/lib/api/services.ts` | `getServices`, `getServiceById`, `getServicesByCategory`, `getEmergencyServices` | Server fn | `Service` | Queries `.from('services')`. **No callers.** |
| `src/types/database.types.ts` | `memareh.services`, `memareh.service_requests` | DB types | — | Enums/tables declared in TS only. |
| `src/types/database.ts` | `Service`, `ServiceRequest`, `BookingFormData`, `ServiceWithIcon` | TS interfaces | — | UI/contract types; no live consumer. |
| `docs/BOOKING_INTEGRATION.md` | design doc | Docs | — | Describes a booking flow + SQL sketch; references components that do NOT exist on disk. |
| `docs/LOGO_INTEGRATION.md`, `docs/HERO_REDESIGN.md`, `docs/ANALYTICS_AUDIT.md`, `docs/DATABASE_INTEGRITY_AUDIT.md`, `docs/MASTER_ARCHITECTURE_AUDIT.md`, `docs/MASTER_AUDIT_FINDINGS.md` | prose mentions | Docs | — | Context/audit only. |

No `src/components/booking/` directory exists. `ServiceSelection.tsx` and `BookingSummary.tsx`
cited in `BOOKING_INTEGRATION.md` are **not present** in the repo.

## 2. Route reachability (user-facing)

| URL | Reachable? | Renders? | Redirects? | Broken by missing table? |
|-----|-----------|----------|-----------|--------------------------|
| `/booking` | Yes (route exists) | No | → `/articles` | No (hard redirect before any query) |
| `/booking/success` | Yes (route exists) | No | → `/articles` | No |
| Any service list / booking form / request submit | No | — | — | N/A (no code path) |

No navigation link, CTA, or sitemap entry points to `/booking`. The feature is **dormant and
non-exposed**; the missing tables cause no live error today because the entry route aborts before
issuing any Supabase query.

## 3. Live DB findings (read-only)

- Mgmt API table list across all schemas: **no** `services`, `service_requests`, `service`,
  `booking`, `bookings`, `request`, `requests`, `appointment`, `appointments`, `offering`,
  `offerings`, `product`, `products`.
- Conclusion: neither the expected tables nor any renamed alternative fulfilling the same domain
  role exist. The domain has **no live authority** in the database.

## 4. Query contracts (what the code expects from `services`)

From `useServices.ts` + `lib/api/services.ts` (all return `Service` rows):

- `getServices`: `select('*').eq('active', true).order('popular', desc).order('name_fa', asc)`
- `getServiceById`: `select('*').eq('id', id).eq('active', true).single()`
- `getServicesByCategory`: `select('*').eq('category', category).eq('active', true).order('name_fa', asc)`
- `getEmergencyServices`: `select('*').eq('is_emergency', true).eq('active', true).order('name_fa', asc)`

Expected `services` column usage: `id, name_fa, slug, description, category, base_price,
estimated_duration, is_emergency, popular, active, icon` (the full TS `Row` also lists
`price_unit, requires_site_visit, image_url, metadata`).

No code path issues any `INSERT`/`UPDATE` against `services` or `service_requests` (the booking
form that would write `service_requests` does not exist; the documented submit handler was never
wired into the redirecting route).

## 5. Type contracts (`database.types.ts`)

`services.Row`: `id, name_fa, slug, description?, category (enum), base_price?, price_unit?,
estimated_duration?, requires_site_visit?, is_emergency?, icon?, image_url?, popular?, active?,
metadata?, created_at?`.

`service_requests.Row`: `id, request_number, customer_id, service_id?, technician_id?, title,
description, images?, property_type (enum), address, city, postal_code?, location_details?,
coordinates?, requested_date, requested_time_slot?, scheduled_datetime?, completed_at?, status
(enum: pending/confirmed/assigned/in_progress/completed/cancelled/disputed), priority (enum:
low/normal/high/emergency), is_emergency?, estimated_cost?, final_cost?, parts_cost?,
labor_cost?, emergency_fee?, discount?, tax?, notes?, cancellation_reason?, rating?, review?,
created_at?, updated_at?`.

Enums implied: `service_category` (installation/repair/maintenance/emergency/inspection),
`request_status` (7 values), `priority_level` (4 values), `property_type` (7 values).

These are **evidence only**, not authoritative schema. They were never materialized.

## 6. Historical evidence

- `supabase/migrations/20260808000000_base_schema_capture.sql` line 24: explicit comment that
  `memareh.services / memareh.service_requests (referenced by TypeScript but [do not exist])`.
- `supabase/migrations/20260809000000_security_baseline_rls.sql` line 20: "Services/Booking
  schema (does not exist; not created here)".
- No migration ever `CREATE`s these tables or the four enums.
- Git history: booking scaffolding was added (`f6e6a44` hooks, `19e0434` booking page save,
  `27224be` success page) but `src/app/booking/page.tsx` was later reduced to `redirect('/articles')`
  (commit `6d2c62b` "Migrate to server components with ISR"). Types/hooks/lib were left orphaned.

## 7. Business rules proven from code

- Services are filtered by `active = true` for all public reads.
- Services ordered by `popular` desc then `name_fa` asc.
- Emergency services filterable via `is_emergency = true`.
- Services categorized via `category`.
- `BOOKING_INTEGRATION.md` asserts booking "requires authentication" (uses `auth.getUser()`,
  `customer_id = user.id`) — but **no code implements this**; it is a doc claim only.
- No proven rule about `service_requests` writes, status transitions, admin workflow, or PII
  handling exists in runnable code.

## 8. Privacy / security requirements (design-stage only)

`service_requests` as typed would store PII-adjacent data: `customer_id`→`profiles`, `address`,
`city`, `postal_code`, `location_details`, `notes`, plus pricing/financial fields. If implemented,
this requires: authenticated-only insert; owner-scoped SELECT; admin-only status/update; and
**no public/anon SELECT** of request rows. These requirements are **not yet established as policy**
and must be confirmed by the product owner before any RLS is written.

## 9. Schema proposal

**NOT PROVIDED.** Per the phase prohibition, schema is NOT invented from TypeScript types while
product intent is unresolved. If Option A is later chosen, the contract in §4–§5 is the starting
point, but enum values, FK targets, and RLS must be confirmed by the owner first.

## 10. RLS proposal

**NOT PROVIDED** (design only, blocked on decision).

## DECISION

# OPTION C — BLOCKED PENDING PRODUCT DECISION

Rationale:
- The feature is **clearly intended** (types, query contract, design doc, hooks/lib exist) → not
  safely deletable as "abandoned" (that would be Option B, premature here).
- It is **not active and not deployable** (`/booking` redirects; no components; no callers; tables
  absent) → no operational breakage to fix today.
- Creating production tables + enums + RLS for a PII-bearing domain **from TypeScript types alone**,
  when the entry route is disabled and product intent (auth model, fields, statuses, admin workflow,
  whether it replaces another system) is unresolved, is exactly the speculative action the phase
  forbids.
- Therefore: **no schema change, no code removal** this phase. The drift remains a known,
  non-breaking discrepancy until the owner decides.

## Required product-owner decisions

1. Is Services/Booking a real public feature, or admin-only, or abandoned?
2. Visitor vs authenticated-only booking? (doc says auth-required; confirm.)
3. Exact `services` fields needed for launch (do we need `price_unit`, `requires_site_visit`,
   `image_url`, `metadata` now, or defer?)
4. Exact `service_requests` fields needed; confirm the 7-value status model and 4-value priority.
5. Who manages services (admin UI or direct DB)? Is there an admin service-management screen?
6. Does the request lifecycle need technician assignment / cost tracking / ratings at launch, or
   is that phase 2?
7. Is this replacing an existing external booking/CRM system?
8. Approval workflow: are requests auto-confirmed or admin-reviewed?

Until these are answered, ARCH-01/DB-02 stay **BLOCKED**.
