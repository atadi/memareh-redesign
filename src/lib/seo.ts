// SEO metadata + structured-data builders.
//
// Pure, deterministic, and testable. No Supabase. All logic degrades safely
// when optional SEO fields are null OR empty-string.

import type { Metadata } from 'next'
import type { MetadataRoute } from 'next'
import {
  DEFAULT_OG_IMAGE,
  SITE_AREA_SERVED,
  SITE_FALLBACK_DESCRIPTION,
  SITE_LOGO_PNG,
  SITE_NAME,
  SITE_PHONE_E164,
} from '@/lib/site'

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

export interface SitemapArticleInput {
  slug: string
  updated_at: string | null
}

function isNonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function nonEmptyArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.length > 0
}

export function absoluteImageUrl(
  url: string | null | undefined,
  siteUrl: string,
): string {
  if (!isNonEmpty(url)) return `${siteUrl}${DEFAULT_OG_IMAGE}`
  try {
     
    new URL(url)
    return url
  } catch {
    const clean = url.startsWith('/') ? url : `/${url}`
    return `${siteUrl}${clean}`
  }
}

/** Always `<siteUrl>/articles/<slug>` — never the browser origin. */
export function generatedArticleCanonical(
  siteUrl: string,
  slug: string | null | undefined,
): string {
  const safeSlug = isNonEmpty(slug) ? slug.trim() : ''
  return `${siteUrl}/articles/${safeSlug}`
}

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
      /* fall through */
    }
  }
  return generatedArticleCanonical(siteUrl, slug)
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

export function pickFeaturedImageAlt(article: {
  featured_image_alt?: string | null
  title?: string | null
}): string {
  if (isNonEmpty(article.featured_image_alt)) return article.featured_image_alt
  if (isNonEmpty(article.title)) return article.title
  return SITE_NAME
}

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
  const imageAlt = pickFeaturedImageAlt(article)
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

export function organizationId(siteUrl: string): string {
  return `${siteUrl}#organization`
}

export function organizationLogoUrl(siteUrl: string): string {
  return `${siteUrl}${SITE_LOGO_PNG}`
}

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
        url: organizationLogoUrl(siteUrl),
      },
    },
    datePublished: article.published_at ?? undefined,
    dateModified: article.updated_at ?? article.published_at ?? undefined,
    inLanguage: 'fa-IR',
  }
}

/** Home → مقالات → Article */
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
        name: 'مقالات',
        item: `${siteUrl}/articles`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name,
        item: articleUrl,
      },
    ],
  }
}

export function buildSiteStructuredData(siteUrl: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Organization', 'Electrician'],
        '@id': organizationId(siteUrl),
        name: SITE_NAME,
        url: siteUrl,
        telephone: SITE_PHONE_E164,
        areaServed: { '@type': 'City', name: SITE_AREA_SERVED },
        logo: {
          '@type': 'ImageObject',
          url: organizationLogoUrl(siteUrl),
        },
      },
      {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: siteUrl,
        inLanguage: 'fa-IR',
        publisher: { '@id': organizationId(siteUrl) },
      },
    ],
  }
}

const HOME_TITLE = 'معماره - خدمات برقکاری حرفه‌ای و مطمئن'
const HOME_DESCRIPTION =
  'دسترسی سریع به تکنسین برقکار در تهران. خدمات اضطراری ۲۴ ساعته، نصب، تعمیر و نگهداری تاسیسات برقی با کیفیت و سرعت.'

export function buildRootMetadata(siteUrl: string): Metadata {
  return {
    metadataBase: new URL(siteUrl),
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    keywords: [
      'برقکار',
      'خدمات برقکاری',
      'تکنسین برق',
      'نصب برق',
      'تعمیر برق',
      'سیم‌کشی',
      'معماره',
    ],
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    icons: {
      icon: [
        { url: '/assets/logo/favicon.svg', type: 'image/svg+xml', sizes: 'any' },
        { url: '/assets/logo/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: [{ url: '/assets/logo/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
      shortcut: '/assets/logo/favicon.svg',
    },
    alternates: { canonical: siteUrl },
    openGraph: {
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      url: siteUrl,
      siteName: SITE_NAME,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: 'معماره - خدمات برقکاری',
        },
      ],
      locale: 'fa_IR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      images: [DEFAULT_OG_IMAGE],
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export function buildPrivateMetadata(title: string): Metadata {
  return {
    title,
    robots: { index: false, follow: false },
  }
}

export function buildArticlesIndexMetadata(
  siteUrl: string,
  filters?: { category?: string; sort?: string },
): Metadata {
  const filtered = Boolean(
    (filters?.category && filters.category !== 'all') ||
      (filters?.sort && filters.sort !== 'newest'),
  )
  const title = 'مقالات برقکاری'
  const description =
    'آموزش‌ها و نکات ایمنی برقکاری ساختمان، عیب‌یابی و نگهداری تاسیسات برقی از معماره.'
  const url = `${siteUrl}/articles`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'fa_IR',
      type: 'website',
    },
    robots: filtered
      ? { index: false, follow: true }
      : { index: true, follow: true },
  }
}

export function buildContactMetadata(siteUrl: string): Metadata {
  const title = 'تماس با معماره'
  const description = `تماس با برقکار معماره در ${SITE_AREA_SERVED}. خدمات اضطراری ۲۴ ساعته.`
  const url = `${siteUrl}/contact-us`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'fa_IR',
      type: 'website',
    },
    robots: { index: true, follow: true },
  }
}

export function buildRobots(siteUrl: string): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/login', '/register', '/profile'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}

function latestArticleDate(articles: SitemapArticleInput[]): Date | undefined {
  let max = 0
  for (const a of articles) {
    if (!a.updated_at) continue
    const t = new Date(a.updated_at).getTime()
    if (!Number.isNaN(t) && t > max) max = t
  }
  return max > 0 ? new Date(max) : undefined
}

export function buildPublicSitemap(
  siteUrl: string,
  articles: SitemapArticleInput[],
): MetadataRoute.Sitemap {
  const latest = latestArticleDate(articles)
  return [
    {
      url: siteUrl,
      ...(latest ? { lastModified: latest } : {}),
    },
    {
      url: `${siteUrl}/articles`,
      ...(latest ? { lastModified: latest } : {}),
    },
    {
      url: `${siteUrl}/contact-us`,
    },
    ...articles.map((article) => ({
      url: `${siteUrl}/articles/${article.slug}`,
      lastModified: article.updated_at ? new Date(article.updated_at) : new Date(),
    })),
  ]
}
