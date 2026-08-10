import { describe, it, expect } from 'vitest'
import type { ArticleRow } from '../src/types/database.types'
import {
  buildArticleMetadata,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  resolveCanonicalUrl,
  absoluteImageUrl,
  organizationId,
} from '../src/lib/seo'

const SITE = 'https://www.memareh.com'

function baseArticle(overrides: Partial<ArticleRow> = {}): ArticleRow {
  return {
    id: 'id-1',
    title: 'عنوان مقاله',
    slug: 'sample-slug',
    excerpt: 'خلاصه مقاله',
    content: null,
    featured_image: null,
    featured_image_alt: null,
    category: null,
    author_id: null,
    author_name: null,
    allow_comments: null,
    status: 'published',
    meta_title: null,
    meta_description: null,
    meta_keywords: null,
    canonical_url: null,
    og_image: null,
    custom_css: null,
    reading_time: null,
    view_count: null,
    is_featured: null,
    video_url: null,
    scheduled_at: null,
    published_at: '2026-01-01T00:00:00Z',
    created_at: null,
    updated_at: '2026-02-01T00:00:00Z',
    ...overrides,
  }
}

describe('seo: meta title priority', () => {
  it('prefers meta_title over title', () => {
    const m = buildArticleMetadata(
      baseArticle({ meta_title: 'سئو تایتل', title: 'عنوان' }),
      SITE,
    )
    expect(m.title).toBe('سئو تایتل')
  })

  it('falls back to title when meta_title empty', () => {
    const m = buildArticleMetadata(
      baseArticle({ meta_title: '', title: 'عنوان' }),
      SITE,
    )
    expect(m.title).toBe('عنوان')
  })

  it('falls back to site suffix when both missing', () => {
    const m = buildArticleMetadata(baseArticle({ title: '', meta_title: '' }), SITE)
    expect(m.title).toContain('معماره')
  })
})

describe('seo: meta description priority', () => {
  it('prefers meta_description over excerpt', () => {
    const m = buildArticleMetadata(
      baseArticle({ meta_description: 'توضیح سئو', excerpt: 'خلاصه' }),
      SITE,
    )
    expect(m.description).toBe('توضیح سئو')
  })

  it('falls back to excerpt when meta_description empty/blank', () => {
    const m = buildArticleMetadata(
      baseArticle({ meta_description: '   ', excerpt: 'خلاصه' }),
      SITE,
    )
    expect(m.description).toBe('خلاصه')
  })
})

describe('seo: meta keywords', () => {
  it('wires meta_keywords array when present', () => {
    const m = buildArticleMetadata(
      baseArticle({ meta_keywords: ['برقکار', 'تهران'] }),
      SITE,
    )
    expect(m.keywords).toEqual(['برقکار', 'تهران'])
  })

  it('omits keywords when empty/null', () => {
    const m = buildArticleMetadata(baseArticle({ meta_keywords: null }), SITE)
    expect(m.keywords).toBeUndefined()
  })
})

describe('seo: canonical url', () => {
  it('uses explicit valid www canonical_url', () => {
    const m = buildArticleMetadata(
      baseArticle({ canonical_url: 'https://www.memareh.com/articles/foo' }),
      SITE,
    )
    expect(m.alternates?.canonical).toBe('https://www.memareh.com/articles/foo')
  })

  it('generates canonical when canonical_url missing', () => {
    const m = buildArticleMetadata(baseArticle({ slug: 'bar' }), SITE)
    expect(m.alternates?.canonical).toBe('https://www.memareh.com/articles/bar')
  })

  it('ignores invalid canonical_url and generates instead', () => {
    const m = buildArticleMetadata(
      baseArticle({ slug: 'baz', canonical_url: 'not a url' }),
      SITE,
    )
    expect(m.alternates?.canonical).toBe('https://www.memareh.com/articles/baz')
  })

  it('resolveCanonicalUrl rejects relative custom values', () => {
    expect(resolveCanonicalUrl('/articles/x', SITE, 'x')).toBe(
      'https://www.memareh.com/articles/x',
    )
  })
})

describe('seo: og image fallback chain', () => {
  it('absolute og_image (storage) is used as-is', () => {
    const storage = 'https://xyz.supabase.co/storage/v1/object/public/x.jpg'
    const m = buildArticleMetadata(baseArticle({ og_image: storage }), SITE)
    expect((m.openGraph?.images as any)[0].url).toBe(storage)
  })

  it('falls back to featured_image when og_image empty', () => {
    const featured = 'https://xyz.supabase.co/storage/v1/object/public/feat.jpg'
    const m = buildArticleMetadata(
      baseArticle({ og_image: '', featured_image: featured }),
      SITE,
    )
    expect((m.openGraph?.images as any)[0].url).toBe(featured)
  })

  it('falls back to site default when both empty', () => {
    const m = buildArticleMetadata(
      baseArticle({ og_image: '', featured_image: '' }),
      SITE,
    )
    expect((m.openGraph?.images as any)[0].url).toBe(
      'https://www.memareh.com/assets/logo/cover-image.jpg',
    )
  })

  it('featured_image_alt used as image alt when present', () => {
    const m = buildArticleMetadata(
      baseArticle({ featured_image_alt: 'آلت تصویر' }),
      SITE,
    )
    expect((m.openGraph?.images as any)[0].alt).toBe('آلت تصویر')
  })

  it('image alt falls back to title when alt empty', () => {
    const m = buildArticleMetadata(
      baseArticle({ featured_image_alt: '', title: 'عنوان' }),
      SITE,
    )
    expect((m.openGraph?.images as any)[0].alt).toBe('عنوان')
  })

  it('absoluteImageUrl passes through absolute and prefixes relative', () => {
    expect(absoluteImageUrl('https://a.com/x.png', SITE)).toBe('https://a.com/x.png')
    expect(absoluteImageUrl('/foo.png', SITE)).toBe('https://www.memareh.com/foo.png')
    expect(absoluteImageUrl('', SITE)).toBe(
      'https://www.memareh.com/assets/logo/cover-image.jpg',
    )
  })
})

describe('seo: structured data', () => {
  it('Article JSON-LD has required fields + references shared org @id', () => {
    const ld = buildArticleJsonLd(
      baseArticle({ meta_title: 'سئو', excerpt: 'خلاصه' }),
      SITE,
    )
    expect(ld['@type']).toBe('Article')
    expect(ld.headline).toBe('سئو')
    expect(ld.url).toBe('https://www.memareh.com/articles/sample-slug')
    expect(ld.mainEntityOfPage).toEqual({
      '@type': 'WebPage',
      '@id': 'https://www.memareh.com/articles/sample-slug',
    })
    expect((ld.author as any)['@id']).toBe(organizationId(SITE))
    expect((ld.publisher as any)['@id']).toBe(organizationId(SITE))
    expect(ld.datePublished).toBe('2026-01-01T00:00:00Z')
    expect(ld.dateModified).toBe('2026-02-01T00:00:00Z')
    expect(ld.inLanguage).toBe('fa-IR')
  })

  it('BreadcrumbList has Home -> Article (no 404 index route)', () => {
    const bc = buildBreadcrumbJsonLd(baseArticle({ title: 'مقاله' }), SITE) as any
    expect(bc['@type']).toBe('BreadcrumbList')
    expect(bc.itemListElement).toHaveLength(2)
    expect(bc.itemListElement[0].name).toBe('خانه')
    expect(bc.itemListElement[0].item).toBe(SITE)
    expect(bc.itemListElement[1].name).toBe('مقاله')
  })

  it('canonical_url with custom value flows into both Article and Breadcrumb', () => {
    const custom = 'https://www.memareh.com/articles/custom'
    const a = baseArticle({ canonical_url: custom })
    expect((buildArticleJsonLd(a, SITE) as any).url).toBe(custom)
    expect(
      (buildBreadcrumbJsonLd(a, SITE) as any).itemListElement[1].item,
    ).toBe(custom)
  })
})

describe('seo: degradation on missing data', () => {
  it('handles null slug / missing dates without throwing', () => {
    const m = buildArticleMetadata(
      baseArticle({ slug: null, published_at: null, updated_at: null }),
      SITE,
    )
    expect(m.alternates?.canonical).toBe('https://www.memareh.com/articles/')
    expect(() =>
      buildArticleJsonLd(
        baseArticle({ slug: null, published_at: null }),
        SITE,
      ),
    ).not.toThrow()
  })
})
