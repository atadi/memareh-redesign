// SEO metadata + structured-data builders for articles.
//
// Pure, deterministic, and testable. No Supabase, no Next runtime imports beyond
// the `Metadata` type. All logic degrades safely when optional SEO fields are
// null OR empty-string (DB columns are sometimes '' rather than NULL).
//
// Field authority (Phase C): memareh.articles SEO columns are AUTHORITATIVE and
// fully populated for published rows, so they take priority (A) with deterministic
// fallbacks (B) only when the value is missing/empty. No production content is
// mutated here.

import type { Metadata } from 'next'

// Minimal subset of memareh.articles fields the SEO builders actually read.
// A full `ArticleRow` is assignable to this, but generateMetadata only selects
// these columns, so the builder accepts the partial shape.
export interface ArticleSeoInput {
  slug: string | null
  title: string
  excerpt: string | null
  featured_image: string | null
  featured_image_alt: string | null
  published_at: string | null
  updated_at: string | null
  meta_title: string | null
  meta_description: string | null
  meta_keywords: string[] | null
  canonical_url: string | null
  og_image: string | null
}

const SITE_NAME = 'معماره'
const DEFAULT_OG_IMAGE = '/assets/logo/cover-image.jpg'
const SITE_FALLBACK_DESCRIPTION = 'معماره - خدمات برقکاری حرفه‌ای و مطمئن'

function isNonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function nonEmptyArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.length > 0
}

/**
 * Return an absolute URL for an image, or the site default when absent.
 * Absolute URLs (e.g. Supabase Storage) are passed through unchanged.
 */
export function absoluteImageUrl(
  url: string | null | undefined,
  siteUrl: string,
): string {
  if (!isNonEmpty(url)) return `${siteUrl}${DEFAULT_OG_IMAGE}`
  try {
    // Already absolute (http/https).
    // eslint-disable-next-line no-new
    new URL(url)
    return url
  } catch {
    const clean = url.startsWith('/') ? url : `/${url}`
    return `${siteUrl}${clean}`
  }
}

/**
 * Resolve the canonical URL for an article.
 * - If the DB `canonical_url` is a valid absolute http(s) URL, use it (priority A).
 * - Otherwise generate `<siteUrl>/articles/<slug>` (fallback B).
 * Invalid/relative/custom values are never emitted as metadata.
 */
export function resolveCanonicalUrl(
  canonicalUrl: string | null | undefined,
  siteUrl: string,
  slug: string | null | undefined,
): string {
  if (isNonEmpty(canonicalUrl)) {
    try {
      const u = new URL(canonicalUrl)
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        return u.toString()
      }
    } catch {
      /* not a valid URL -> fall through to generated */
    }
  }
  const safeSlug = isNonEmpty(slug) ? slug : ''
  return `${siteUrl}/articles/${safeSlug}`
}

function pickTitle(article: ArticleSeoInput): string {
  if (isNonEmpty(article.meta_title)) return article.meta_title
  if (isNonEmpty(article.title)) return article.title
  return `${SITE_NAME} - مقاله`
}

function pickDescription(article: ArticleSeoInput): string {
  if (isNonEmpty(article.meta_description)) return article.meta_description
  if (isNonEmpty(article.excerpt)) return article.excerpt as string
  return SITE_FALLBACK_DESCRIPTION
}

/** Build Next `Metadata` for an article detail page. */
export function buildArticleMetadata(
  article: ArticleSeoInput,
  siteUrl: string,
): Metadata {
  const articleUrl = resolveCanonicalUrl(article.canonical_url, siteUrl, article.slug)
  const title = pickTitle(article)
  const description = pickDescription(article)
  const image = absoluteImageUrl(
    isNonEmpty(article.og_image) ? article.og_image : article.featured_image,
    siteUrl,
  )
  const imageAlt = isNonEmpty(article.featured_image_alt)
    ? article.featured_image_alt
    : title
  const keywords = nonEmptyArray(article.meta_keywords)
    ? article.meta_keywords
    : undefined

  return {
    title,
    description,
    keywords,
    metadataBase: new URL(siteUrl),
    alternates: { canonical: articleUrl },
    openGraph: {
      title,
      description,
      url: articleUrl,
      siteName: SITE_NAME,
      locale: 'fa_IR',
      type: 'article',
      images: [{ url: image, width: 1200, height: 630, alt: imageAlt }],
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.updated_at ?? article.published_at ?? undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    robots: { index: true, follow: true },
  }
}

/** Organization @id used by both site-level and article-level structured data. */
export function organizationId(siteUrl: string): string {
  return `${siteUrl}#organization`
}

/** Article JSON-LD (references the shared Organization by @id). */
export function buildArticleJsonLd(
  article: ArticleSeoInput,
  siteUrl: string,
): Record<string, unknown> {
  const articleUrl = resolveCanonicalUrl(article.canonical_url, siteUrl, article.slug)
  const title = pickTitle(article)
  const image = absoluteImageUrl(
    isNonEmpty(article.og_image) ? article.og_image : article.featured_image,
    siteUrl,
  )
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: pickDescription(article),
    image,
    url: articleUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: siteUrl,
      '@id': organizationId(siteUrl),
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      '@id': organizationId(siteUrl),
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/assets/logo/logo-square.svg`,
      },
    },
    datePublished: article.published_at ?? undefined,
    dateModified: article.updated_at ?? article.published_at ?? undefined,
    inLanguage: 'fa-IR',
  }
}

/**
 * BreadcrumbList JSON-LD for an article page.
 * NOTE: there is no `/articles` index route in this app, so the crumb chain is
 * Home -> Article (truthful, never 404s). If an index route is added later,
 * insert a middle "مقالات" -> `${siteUrl}/articles` item here.
 */
export function buildBreadcrumbJsonLd(
  article: ArticleSeoInput,
  siteUrl: string,
): Record<string, unknown> {
  const articleUrl = resolveCanonicalUrl(article.canonical_url, siteUrl, article.slug)
  const name = isNonEmpty(article.title) ? article.title : 'مقاله'
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'خانه',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name,
        item: articleUrl,
      },
    ],
  }
}
