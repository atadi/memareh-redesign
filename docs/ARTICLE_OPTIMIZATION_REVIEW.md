# Manual Review — 8 `REVIEW_REQUIRED` Articles

Phase: Manual Review + CTA Decision. Read-only with respect to production
article content. **PRODUCTION ARTICLE WRITES: ZERO.**

Source of truth: `docs/ARTICLE_OPTIMIZATION_DRY_RUN.json` (regenerated after the
optimizer policy fixes in this phase). Review decisions are additive; the
original dry-run hashes are not rewritten as if history never happened.

Internal score = `امتیاز داخلی بهینه‌سازی`, not a Google score.

---

## Drift check

All 8 articles re-read from production before review. Every one matched the
dry-run record on both `updated_at` and content SHA-256.

| Result | Count |
| ------ | ----: |
| FRESH  | 8 |
| STALE — REANALYSIS REQUIRED | 0 |

`custom_css` is **NULL for all 8**, so no Local CSS selector can be broken by a
class transformation. §14 is a no-op for this set.

---

## Decisions

| # | Article | Score | Proposed | Decision |
| - | ------- | ----: | -------: | -------- |
| 1 | برقکار فوری تهرانپارس | 71 | 97 | APPROVE_SAFE_DEFAULT |
| 2 | برقکار پونک | 68 | 97 | APPROVE_SAFE_DEFAULT |
| 3 | برقکار سعادت‌آباد | 71 | 97 | APPROVE_SAFE_DEFAULT |
| 4 | برقکار صادقیه | 64 | 97 | APPROVE_SAFE_DEFAULT |
| 5 | برقکار هفت تیر | 68 | 97 | APPROVE_WITH_RULE_ADJUSTMENT |
| 6 | برقکار ستارخان | 71 | 97 | APPROVE_SAFE_DEFAULT |
| 7 | چرا چراغ‌های خانه چشمک می‌زنند (pilot) | 93 | 93 | DO_NOT_OPTIMIZE (no change needed) |
| 8 | دلایل قطع و وصل شدن مکرر برق | 68 | 97 | APPROVE_WITH_RULE_ADJUSTMENT |

Every decision applies to the **safe-default** rule set only. Mode-B
(medium-confidence) structural suggestions remain unapproved for all 8.

---

### 1. برقکار فوری شبانه روزی تهرانپارس
`brghkar-fvri-shbanh-rvzi-thranpars-aazam-sria-brghkar-mtkhss-grvh-mamarh`
`2b1170a4` · 71 → 97 · custom_css NULL

- Safe: 12 non-www internal links, 41 internal `nofollow`, 1 body H1.
- Judgment: 2 heading jumps (H1→H3 "فهرست مطالب", H2→H4 "اعزام سریع"); 7 FAQ
  Q/A pairs with real answers (95–176 chars).
- Only reason for REVIEW was the medium-confidence `heading-jump` finding, which
  the safe-default set does **not** act on.
- **APPROVE_SAFE_DEFAULT.** Heading levels unchanged; revisit under a separate
  heading phase.

### 2. برقکار پونک تهران
`brghkar-pvnk-thran-aazam-fvri-kmtr-az-dghighh-shbanhrvzi`
`bd69db06` · 68 → 97 · custom_css NULL

- Safe: 14 non-www, 123 inline style attrs, 1 body H1. No `nofollow`.
- Judgment: 2 heading jumps; 3 external same-tab links (no `target=_blank`, so
  the reviewed rel policy correctly leaves them alone).
- **APPROVE_SAFE_DEFAULT.**

### 3. برقکار سعادت‌آباد تهران
`brghkar-saadtabad-thran-aazam-brghkar-fvri-dr-kmtr-az-dghighh-shbanh-rvzi`
`3be24ee4` · 71 → 97 · custom_css NULL

- Safe: 13 non-www, 51 inline style attrs, 1 body H1.
- Judgment: 2 heading jumps, one at an expert-card name ("محمد رضایی") — a
  legitimate embedded heading, not a defect.
- Carries a `ثبت درخواست آنلاین` CTA pointing at the bare homepage (see CTA
  section) — a content matter, not an optimizer matter.
- **APPROVE_SAFE_DEFAULT.**

### 4. برقکار صادقیه تهران
`brghkar-sadghih-thran-aazam-fvri-zir-dghighh-bhsvrt-shbanhrvzi`
`82707d56` · 64 → 97 · custom_css NULL

- Safe: 22 non-www (highest in the set), 60 internal `nofollow`, 19 inline
  styles, 1 body H1.
- Judgment: H1 text does not match `title`. The H1 is a longer descriptive
  variant, not a wrong-article H1. Body H1 removal is a safe-default rule and
  the `title` remains authoritative, so no text is lost.
- **APPROVE_SAFE_DEFAULT.**

### 5. برقکار شبانه‌روزی هفت تیر | مطهری | بهشتی
`brghkar-shbanhruzi-haft-tir-motahri-behshti`
`06f157d0` · 68 → 97 · custom_css NULL

- Safe: 14 non-www, 14 inline styles, 1 body H1.
- Judgment: **3** heading jumps — an entire H4 service block sitting directly
  under an H2 (رفع اتصالی برق, تعمیر فیوز, آیفون, دوربین, کولر, سیم‌کشی). These
  are siblings of each other and semantically should be H3.
- Shares a template with article 8 (Jaccard 0.71 on visible text).
- **APPROVE_WITH_RULE_ADJUSTMENT** — approved for the safe-default set on the
  explicit condition that heading levels are NOT auto-promoted. Promoting H4→H3
  here is defensible but is a semantic decision, and the same template appears
  in article 8, so it should be handled once, deliberately, in a heading phase.

### 6. برقکار ستارخان تهران
`brghkar-starkhan-thran-aazam-fvri-zir-dghighh-bhsvrt-shbanhrvzi`
`223f9b21` · 71 → 97 · custom_css NULL

- Safe: 14 non-www, **167 inline style attrs** (most in the corpus), 1 body H1.
- Judgment: 1 heading jump (H2→H4 at a "نکات طلایی" callout — a legitimate
  embedded callout heading). Numbered service headings use emoji digits
  (1️⃣ 2️⃣ …) and are already real H3s, not decorative numeric paragraphs, so the
  step-recognition rule correctly does not fire.
- **APPROVE_SAFE_DEFAULT.**

### 7. چرا چراغ‌های خانه چشمک می‌زنند؟ — PILOT CONTROL
`chra-cheragh-haye-khaneh-cheshmak-mizanand`
`faa040e6` · 93 → 93 · custom_css NULL

- Zero body H1, zero non-www, zero internal nofollow, zero inline styles.
- 1 table, well-formed: 5 rows, 3 `th`, `thead` present, no colspan/rowspan.
- 4 genuine procedural steps, each a numeric paragraph followed by a real
  instruction paragraph.
- After the fixes in this phase the optimizer output is **byte-identical to the
  stored content**. The article needs nothing.
- Its only finding is the CTA mismatch, which is a content decision.
- **DO_NOT_OPTIMIZE** — nothing to apply. Retain as the regression control.

### 8. دلایل قطع و وصل شدن مکرر برق
`dalile-ghate-va-vasl-shodan-mokrar-bargh`
`a97f3bdf` · 68 → 97 · custom_css NULL

- Safe: 14 non-www, 14 inline styles, 1 body H1.
- Judgment: same 3 heading jumps and the same H4 service block as article 5.
- **Content issue for the operator (not an optimizer issue):** the body H1 reads
  "🌙 برقکار شبانه‌روزی هفت تیر، مطهری و بهشتی ۲۴ ساعته" while the article title
  is "دلایل قطع و وصل شدن مکرر برق". The body was cloned from article 5 and the
  heading was never rewritten. The safe-default rule removes the duplicate body
  H1, which happens to remove the wrong heading — correct here, but the shared
  body text remains a duplicate-content concern worth a separate editorial pass.
- **APPROVE_WITH_RULE_ADJUSTMENT** — same condition as article 5 (no automatic
  heading-level promotion), plus flag for editorial de-duplication.

---

## Optimizer policy changes made in this phase

Three defects were found while reviewing, all of which made already-clean
articles look changed. All are repository code changes only.

### 1. `rel="noopener noreferrer"` was added to every anchor
Source: `src/lib/html-sanitizer.ts` (not the optimizer). The hook stamped
`noopener noreferrer` on **every** `<a href>`.

Reverse-tabnabbing is only reachable when a link opens a new browsing context.
The old rule therefore added no security value on same-tab links, stripped the
referrer from the site's own internal navigation, and rewrote clean markup on
every pass. Corpus reality: **0 links** in the review set use `target="_blank"`.

New policy:

| Link kind | rel |
| --------- | --- |
| Internal same-tab | none added; existing `nofollow` removed by optimizer |
| External same-tab | left exactly as authored |
| Any `target="_blank"` | `noopener noreferrer` enforced, existing tokens preserved, no duplicates |
| `tel:` / `mailto:` | untouched |
| `javascript:` / `data:` / `vbscript:` | href removed (unchanged) |

An empty `rel=""` is now dropped instead of re-emitted.

### 2. Trailing-slash oscillation
`canonicalizeMemareh()` did `MEMAREH_WWW + (path || '/')`, appending `/` to a
bare-origin link and so rewriting `https://www.memareh.com` on every run.

Verified against the live site: `/articles/<slug>` returns **200** and
`/articles/<slug>/` returns **308**. Next.js `trailingSlash` is unset (default
`false`), so the **no-trailing-slash** form is canonical.

Policy: canonicalize the **origin only** (`http`→`https`, add `www`); preserve
the path byte-for-byte. Never add or trim a trailing slash.

### 3. Empty `class=""` and class-token churn
`canonicalizeDom()` re-set `class` whenever the attribute was present-but-empty,
and sorted class tokens alphabetically. Sorting is idempotent but rewrote the
class list of every already-clean article on first run, making a no-op look like
a real change and defeating byte-level drift detection.

Policy: drop empty `class`/`rel`; dedupe class tokens while **preserving
authored order**.

**Result:** the pilot article is now byte-identical after optimization, not
merely semantically stable — §15's ideal outcome.

Regression coverage: `tests/article-link-policy.test.ts` (17 tests).
`tests/html-sanitizer.test.ts` was updated: one test asserted the old
indiscriminate rel behavior that this review deliberately reversed.

---

## Complex tables

The dry-run flagged 2 complex tables corpus-wide; neither is in the review set.
The only table among the 8 is the pilot's (article 7): 5 rows, 3 `th`, `thead`
already present, **no colspan, no rowspan, not nested**.

- Pilot table → `SAFE_SEMANTIC_CONVERSION` (already conformant; optimizer is a
  no-op on it).
- The 2 corpus-wide complex tables → `MANUAL_TABLE_REVIEW`, deferred. They are
  in SAFE_TO_OPTIMIZE articles and must not be flattened to satisfy the scorer.

---

## Heading decisions

| Pattern | Occurrences | Verdict |
| ------- | ----------: | ------- |
| H1→H3 "فهرست مطالب" | 6 of 8 | Structural defect, low risk, but **not** auto-fixed — deferred |
| H2→H4 callout heading ("نکات طلایی", "موارد احتیاطی") | several | Legitimate embedded heading — do not change |
| H2→H4 expert-card name | 1 | Legitimate — do not change |
| H2→H4 whole service block (articles 5, 8) | 2 articles | Real defect, shared template — deferred to a deliberate heading phase |

No heading level is changed by the safe-default set. `heading-jump` remains a
report-only medium-confidence finding.

---

## FAQ decisions

6 articles corpus-wide contain FAQ; 53 questions detected; 1 already structured.

Inspection of the review set found the detector is honest but not precise
enough to automate:

- Article 1 has **7 real FAQ pairs** (question paragraph + 95–176 char answer) —
  genuine, plus one false positive ("۴. چرا گروه معماره؟" with no following
  element).
- Articles 5 and 8 each matched a **rhetorical** sentence ending in "؟"
  ("تصور کنید: یک شب سرد زمستانی…") — not a FAQ.
- Article 6 matched a marketing question — not a FAQ.

Verdict: FAQ transformation stays **medium-confidence / suggested only**. No FAQ
JSON-LD added, per §8. Visual/semantic `article-*` classes only, and not in this
phase.

---

## Step / callout decisions

- **Steps:** the only genuine procedural sequence in the corpus is the pilot's
  4-step guide, each numeric paragraph followed by a real instruction. It is
  already structured. Articles 4 and 6 use numeric/emoji-digit *headings*, which
  are already H3s — correctly not treated as steps. No numeric paragraph is
  transformed on the basis of a number alone.
- **Callouts:** 3 warning callouts corpus-wide, all in the pilot and all already
  structured. The "نکات طلایی" / "موارد احتیاطی" blocks in articles 3–6 are
  heading + adjacent content (real structural evidence) but are **not**
  transformed by the safe-default set. No paragraph is converted merely for
  containing the word هشدار.

---

## Inline-style validation

520 inline style attributes corpus-wide; 219 across the review set. All distinct
declarations were enumerated and inspected.

- **Zero** contain `display:none`, `visibility:hidden`, `float`, or `position`.
- All are presentation-only: color, background, padding, border-radius,
  font-size, box-shadow, gradients, flex/grid layout of decorative cards.
- No style encodes a status with no textual equivalent.

**Non-obvious finding:** 5 articles embed `<style>` blocks defining CSS custom
properties (`--navy`, `--gold`, `--purple`) that their inline styles reference
via `var(--…)`. Removing the inline styles without the variables would be a
concern — except the render boundary already strips both. Verified against the
live production page for article 5: **0 `<style>` blocks, 0 `--navy`
references, 1 `style=` attribute on the entire page** (and that one is not from
article content). `sanitizeHtml` forbids `style` tags and excludes the `style`
attribute, and it runs at render time in `ArticleContent`.

Conclusion: these styles are **already dead in production**. Removing them from
stored content changes nothing a visitor sees. The dry-run's
"520 safely removable" assessment is confirmed by live evidence.

---

## CTA corpus findings

Booking was removed, so every "request/booking" CTA is a candidate mismatch.

| Destination | Occurrences | Status |
| ----------- | ----------: | ------ |
| `https://www.memareh.com/contact-us` | 26 | Valid — real contact page |
| `https://www.memareh.com/` | 6 | مشاوره رایگان → homepage (weak but not broken) |
| `#contact` | 7 | In-page anchor |
| `tel:09126769048` | 2 | Valid |
| `https://www.memareh.com` (bare) | **2** | **Mismatch** |

The 2 genuine mismatches:

| Article | Visible CTA | href | Inferred intent |
| ------- | ----------- | ---- | --------------- |
| `chra-cheragh-haye-khaneh-cheshmak-mizanand` | ثبت درخواست در سایت معماره | `https://www.memareh.com` | Submit a service request |
| `brghkar-saadtabad-thran-aazam-brghkar-fvri-…` | 📝 ثبت درخواست آنلاین | `https://www.memareh.com` | Submit a service request |

Note the second article contains **three other** `ثبت درخواست` CTAs that already
point to `/contact-us` — so within one article the same action links to two
different places. The dry-run's CTA detector reported only 1 mismatch because it
matches one exact CTA string; the corpus scan in this phase found the second.

Also worth an editorial look: `#contact` (7 uses) is an in-page anchor with no
matching element in the article body, so it is a dead scroll target.

---

## CTA operator decision required

For the 2 mismatched CTAs, exactly one option must be chosen **by the operator**:

- **Option A — Keep text, point to homepage (current).** Pro: no broken link.
  Con: the label promises a request form the destination does not provide.
- **Option B — Change CTA text to match a general contact action.** Requires a
  visible-text change → belongs to a future explicitly approved CONTENT phase.
- **Option C — Point to `https://www.memareh.com/contact-us`.** This destination
  genuinely exists and is already used by 26 other CTAs in the same corpus,
  including three in one of the two affected articles. Href-only change, no
  visible text change. **This is the internally consistent option, but it is
  still a product decision and is not being made here.**
- **Option D — Remove the CTA.** Content modification requiring explicit
  approval.

No option has been applied. Nothing was rewritten.

---

## Metadata review (read-only)

| Article | meta_title | meta_desc | canonical | og_image | alt | Category |
| ------- | ---------: | --------: | --------- | -------- | --: | -------- |
| تهرانپارس | 79 (long) | 157 | ok | missing | 27 | NEEDS_CONTENT_EDITOR + NEEDS_IMAGE/ALT |
| پونک | 58 | 220 (long) | ok | missing | 0 | NEEDS_CONTENT_EDITOR + NEEDS_IMAGE/ALT |
| سعادت‌آباد | 64 (long) | 246 (long) | ok | missing | 0 | NEEDS_CONTENT_EDITOR + NEEDS_IMAGE/ALT |
| صادقیه | 56 | 249 (long) | ok | missing | 24 | NEEDS_CONTENT_EDITOR + NEEDS_IMAGE/ALT |
| هفت تیر | 66 (long) | 304 (long) | ok | missing | 37 | NEEDS_CONTENT_EDITOR + NEEDS_IMAGE/ALT |
| ستارخان | 57 | 252 (long) | ok | missing | 25 | NEEDS_CONTENT_EDITOR + NEEDS_IMAGE/ALT |
| pilot | 50 | 149 | ok | missing | 0 | NEEDS_IMAGE/ALT |
| قطع و وصل برق | 58 | 115 (short) | ok | present | 0 | NEEDS_CONTENT_EDITOR + NEEDS_IMAGE/ALT |

- `canonical_url`: correct and matching the slug on all 8. **0 mismatches.**
- `og_image`: missing on 7 of 8.
- `featured_image_alt`: missing on 4 of 8.
- `meta_description` outside 120–160 on 7 of 8.

No value was generated or written. `wouldMetadataChange = false` for all 25.

---

## Aggregate after review

| Metric | Value |
| ------ | ----: |
| Reviewed | 8 |
| APPROVE_SAFE_DEFAULT | 5 |
| APPROVE_WITH_RULE_ADJUSTMENT | 2 |
| MANUAL_TRANSFORMATION_REQUIRED | 0 |
| DO_NOT_OPTIMIZE | 1 (pilot, already optimal) |
| Stale / needing reanalysis | 0 |
| custom_css conflicts | 0 |
| Text-integrity failures | 0 |
| Idempotence failures | 0 |
| Production article writes | **0** |

All 8 are resolved. None requires manual HTML surgery before a bulk-write phase.
