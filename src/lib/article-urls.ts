// Single source of truth for public article URLs.
//
// Article canonical URLs are DERIVED DATA. They are built only from the
// canonical site origin (NEXT_PUBLIC_SITE_URL, passed in explicitly) and the
// article slug. Never use window.location.origin, VERCEL_URL or a request host.

export function isValidArticleSlug(slug: unknown): slug is string {
  return (
    typeof slug === 'string' &&
    slug.length > 0 &&
    slug === slug.trim() && // no leading/trailing whitespace
    !/[\s/]/.test(slug) // no internal whitespace or path separators
  )
}

export function articlePublicUrl(
  siteUrl: string,
  slug: string | null | undefined,
): string {
  if (typeof siteUrl !== 'string' || siteUrl.trim().length === 0) {
    throw new Error('[article-urls] siteUrl is required')
  }
  if (!isValidArticleSlug(slug)) {
    throw new Error(
      `[article-urls] invalid article slug: ${JSON.stringify(slug)}`,
    )
  }
  return `${siteUrl.replace(/\/+$/, '')}/articles/${slug}`
}
