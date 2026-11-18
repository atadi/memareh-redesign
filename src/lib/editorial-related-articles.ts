export const MAX_EDITORIAL_RELATED_ARTICLES = 3

export interface EditorialRelatedArticle {
  id: string
  title: string
  slug: string | null
  category: string | null
}

export function addEditorialRelatedArticle(
  selected: EditorialRelatedArticle[],
  candidate: EditorialRelatedArticle,
): EditorialRelatedArticle[] {
  if (
    selected.length >= MAX_EDITORIAL_RELATED_ARTICLES ||
    selected.some(article => article.id === candidate.id)
  ) {
    return selected
  }
  return [...selected, candidate]
}

export function removeEditorialRelatedArticle(
  selected: EditorialRelatedArticle[],
  articleId: string,
): EditorialRelatedArticle[] {
  return selected.filter(article => article.id !== articleId)
}

export function moveEditorialRelatedArticle(
  selected: EditorialRelatedArticle[],
  index: number,
  direction: -1 | 1,
): EditorialRelatedArticle[] {
  const targetIndex = index + direction
  if (index < 0 || index >= selected.length || targetIndex < 0 || targetIndex >= selected.length) {
    return selected
  }

  const reordered = [...selected]
  const [item] = reordered.splice(index, 1)
  reordered.splice(targetIndex, 0, item)
  return reordered
}

export function filterEditorialRelatedCandidates(
  candidates: EditorialRelatedArticle[],
  currentArticleId: string | undefined,
  selected: EditorialRelatedArticle[],
  query: string,
): EditorialRelatedArticle[] {
  const selectedIds = new Set(selected.map(article => article.id))
  const normalizedQuery = query.trim().toLocaleLowerCase()

  return candidates.filter(article => {
    if (article.id === currentArticleId || selectedIds.has(article.id)) return false
    if (!normalizedQuery) return true
    return (
      article.title.toLocaleLowerCase().includes(normalizedQuery) ||
      (article.slug ?? '').toLocaleLowerCase().includes(normalizedQuery)
    )
  })
}
