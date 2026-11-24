// Regression guard: article canonical URLs are derived from slug + site URL.
// No application code may read, write, or expose an article-level canonical
// override.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const read = (rel: string) =>
  readFileSync(path.resolve(process.cwd(), rel), 'utf8')

describe('canonical override has been removed', () => {
  it('the editor has no editable canonical field and no browser-origin article URL', () => {
    const src = read('src/components/admin/ArticleEditor.tsx')
    expect(src).not.toContain("register('canonical_url')")
    expect(src).not.toContain('canonical_url:')
    expect(src).not.toMatch(/window\.location\.origin\}\/articles/)
    expect(src).toContain('آدرس اصلی مقاله')
    expect(src).toContain('articlePublicUrl(siteUrl')
  })

  it('save payload, types, optimizer and article query have no canonical override', () => {
    for (const file of [
      'src/components/admin/ArticleEditor.tsx',
      'src/types/database.types.ts',
      'src/types/database.ts',
      'src/domain/articles/optimizer.ts',
      'src/app/articles/[slug]/page.tsx',
      'src/lib/seo.ts',
    ]) {
      expect(read(file), file).not.toContain('canonical_url')
    }
  })

  it('obsolete URL helpers are gone', () => {
    const src = read('src/lib/seo.ts')
    expect(src).not.toContain('resolveCanonicalUrl')
    expect(src).not.toContain('generatedArticleCanonical')
  })
})
