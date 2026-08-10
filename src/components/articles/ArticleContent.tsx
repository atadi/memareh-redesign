import { sanitizeHtml } from '@/lib/html-sanitizer'
import { scopeArticleCss } from '@/lib/article-css'

interface ArticleContentProps {
  content: string
  /**
   * Article id. Used as the local-CSS scope anchor via `data-article-id`.
   * Optional so callers that only render content (e.g. an unsaved draft
   * preview) keep working.
   */
  articleId?: string
  /**
   * Raw per-article CSS as stored in the database, or the editor's unsaved
   * buffer in preview. It is validated and scoped here — never emitted raw.
   */
  customCss?: string | null
}

/**
 * The single rendering boundary for article body HTML.
 *
 * Ordering matters: the global article design system (`src/styles/
 * article-content.css`, registered in globals.css) is applied first, then the
 * per-article <style> block below, so local CSS can intentionally override the
 * global design — but only inside this article's scope.
 */
export function ArticleContent({ content, articleId, customCss }: ArticleContentProps) {
  const scopeId = articleId ?? 'preview'
  const scopedCss = customCss ? scopeArticleCss(customCss, scopeId) : ''

  return (
    <div className="article-content" data-article-id={scopeId}>
      {scopedCss && (
        <style
          data-article-css={scopeId}
          dangerouslySetInnerHTML={{ __html: scopedCss }}
        />
      )}
      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
    </div>
  )
}
