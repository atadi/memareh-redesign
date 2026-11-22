# Vision

Memareh is a fast, trustworthy Persian-language website for electrical services in Tehran, supported by a practical article and content-management platform.

The project should help people quickly understand Memareh’s services, contact an electrician, and find useful electrical guidance through high-quality articles.

The administration side should make it easy to create, publish, optimize, organize, and maintain content without requiring code changes.

The factory should prioritize improvements that make the public website more useful, easier to discover through search, easier to maintain, and safer to operate.

## Goals

Over the next months, the project should:

- Improve organic search visibility for relevant electrical-service and informational searches.
- Build a strong library of useful Persian articles around electrical safety, troubleshooting, maintenance, installation, and related topics.
- Improve internal linking and relationships between articles and service content.
- Make article publishing and SEO management simple for administrators.
- Improve conversion from visitors into phone calls, WhatsApp contacts, and service requests.
- Keep the public website fast, mobile-friendly, accessible, and easy to navigate.
- Improve the article-reading experience without adding unnecessary UI complexity.
- Keep the content and administration architecture maintainable as the number of articles grows.
- Keep Production stable while making small, incremental improvements.
- Maintain a safe and reproducible Supabase database and deployment process.

## Target users

### People looking for electrical services

They need to:

- quickly understand what Memareh provides;
- know that the service is relevant to their problem;
- easily contact Memareh;
- use the site comfortably on mobile;
- trust the information and business;
- move easily between service information and useful articles.

### People searching for electrical information

They need:

- useful and understandable Persian articles;
- clear headings and readable formatting;
- related articles that genuinely help them continue researching;
- accurate information without unnecessary filler;
- easy navigation back to articles, the homepage, or service contact options.

### Memareh administrators and content editors

They need to:

- create and edit articles without touching source code;
- manage SEO metadata;
- manage images and article presentation;
- select related articles manually;
- preview content before publishing;
- schedule, publish, archive, and maintain articles;
- make content changes safely without risking Production data.

## Principles

- Prefer small, focused changes over large rewrites.
- Preserve existing working behaviour unless there is a clear reason to change it.
- Keep public URLs and established routes stable.
- Do not introduce unnecessary dependencies.
- Prefer simple solutions over infrastructure or abstractions that are not currently needed.
- Use the database relationally when relationships are real data; do not hide structured relationships inside JSON or arbitrary text fields.
- Keep editorial decisions under human control where judgment matters.
- Do not automatically generate or infer content relationships when an editor should choose them.
- SEO improvements must be evidence-based, not based on SEO folklore or keyword stuffing.
- Public pages should be designed first for real users, then optimized for search engines.
- Mobile usability is a first-class requirement.
- Accessibility and semantic HTML should be preserved or improved.
- Security controls must not be weakened for convenience.
- Existing Production data must never be put at unnecessary risk.
- Database changes should be additive whenever practical.
- If a database operation can affect existing Production data, prove it is safe or create and verify a backup first.
- Never expose privileged keys, secrets, tokens, or credentials.
- Keep implementations understandable to future developers and agents.

## Out of scope

The factory must not propose or perform the following unless explicitly requested by a human:

- Large framework rewrites.
- Replacing Next.js, React, Supabase, or Vercel without a specific approved migration project.
- Rebuilding the application simply to adopt a different architecture.
- Mass rewriting existing articles.
- Automatic bulk SEO rewriting of published content.
- Keyword stuffing or mass-generated thin SEO pages.
- Automatically creating large numbers of Tehran location pages.
- Automatically choosing related articles when editors have explicitly configured them.
- Changing article meaning or factual content as part of formatting or technical optimization.
- Destructive Production database cleanup.
- Deleting historical data because it appears unused.
- Rewriting migration history.
- Weakening RLS, authentication, authorization, or revalidation security.
- Making admin functionality publicly discoverable without an explicit product decision.
- Adding payment systems, subscriptions, marketplaces, or unrelated business features without explicit approval.
- Introducing complex infrastructure for hypothetical future requirements.
- Adding dependencies when the same result can reasonably be achieved with the current stack.
- Changing branding, business identity, phone numbers, service claims, or legal information without human approval.

## Quality bar

- Every meaningful behaviour change should have focused regression tests.
- Bug fixes should include a test when the behaviour can reasonably be tested.
- Existing tests must continue to pass.
- Type checking must pass.
- Lint must introduce no new errors.
- `git diff --check` must pass.
- GitHub Actions must be green before a change is considered complete.
- The Production build must pass in Linux CI.
- Do not claim CI will succeed; verify the completed run.
- Important UI changes should be manually verified on representative desktop and mobile layouts.
- Admin workflows should be manually verified when they change.
- Public article changes should be checked on a real published or controlled article.
- Database migrations must be tested before Production.
- Production migrations must be minimal and explicitly reviewed for data risk.
- Existing Production row counts or equivalent integrity checks should be used when a migration warrants them.
- Additive schema changes must not silently mutate existing data.
- Failed partial operations must not be reported to administrators as complete success.
- No secrets may appear in source control, logs, reports, or test output.
- Commits should be focused and should not mix unrelated cleanup with feature work.
- Never force-push `master`.

## Protected areas

Changes involving these paths or topics always require human review. The factory may prepare the change, but it must never autonomously merge or apply them to Production without human approval.

### Authentication and authorization

- `src/app/auth/**`
- `src/app/login/**`
- `src/app/register/**`
- `src/app/admin/login/**`
- `src/lib/auth-role.ts`
- authentication flows
- administrator access
- authorization rules
- Supabase Auth configuration

### Database and Production data

- `supabase/migrations/**`
- RLS policies
- database grants and privileges
- database functions using `SECURITY DEFINER`
- destructive SQL
- Production data updates or deletes
- schema changes affecting existing columns or tables
- migration-history changes
- backups and restores

Any operation capable of modifying or deleting existing Production data requires explicit human approval and either:

1. clear evidence that the operation is safe and non-destructive, or
2. a verified backup before execution.

### CI, deployment, and runtime configuration

- `.github/workflows/**`
- `vercel.json`
- Production environment variables
- deployment configuration
- build configuration that changes Production behaviour

### Revalidation and privileged server operations

- `src/app/api/revalidate/**`
- revalidation secrets
- privileged Supabase/service-role usage
- server-only secrets
- webhook authentication

### Business-critical identity and legal information

- phone numbers
- WhatsApp destinations
- business identity
- service claims
- pricing
- legal text
- privacy-related content
- licensing
- payments

### Repository governance

- `LICENSE`
- force pushes
- branch-history rewrites
- deletion of migration history
- mass file deletion
