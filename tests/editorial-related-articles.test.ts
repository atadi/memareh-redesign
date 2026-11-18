import { describe, expect, it } from 'vitest'
import {
  addEditorialRelatedArticle,
  filterEditorialRelatedCandidates,
  moveEditorialRelatedArticle,
  removeEditorialRelatedArticle,
  type EditorialRelatedArticle,
} from '../src/lib/editorial-related-articles'

const article = (id: string, title = id): EditorialRelatedArticle => ({
  id,
  title,
  slug: `${id}-slug`,
  category: 'maintenance',
})

describe('editorial related article selection', () => {
  it('excludes the current and already-selected articles while searching title or slug', () => {
    const candidates = [
      article('current', 'Current'),
      article('selected', 'Selected'),
      article('one', 'Water Heater'),
      article('two', 'Electrical Safety'),
    ]

    expect(
      filterEditorialRelatedCandidates(candidates, 'current', [article('selected')], 'water'),
    ).toEqual([article('one', 'Water Heater')])
    expect(
      filterEditorialRelatedCandidates(candidates, 'current', [], 'two-slug'),
    ).toEqual([article('two', 'Electrical Safety')])
  })

  it('allows at most three selections and never replaces an existing item', () => {
    const selected = [article('a'), article('b'), article('c')]
    expect(addEditorialRelatedArticle(selected, article('d'))).toBe(selected)
    expect(addEditorialRelatedArticle([article('a')], article('a'))).toEqual([article('a')])
  })

  it('removes and reorders selections without changing unrelated items', () => {
    const selected = [article('a'), article('b'), article('c')]
    expect(removeEditorialRelatedArticle(selected, 'b').map(item => item.id)).toEqual(['a', 'c'])
    expect(moveEditorialRelatedArticle(selected, 2, -1).map(item => item.id)).toEqual(['a', 'c', 'b'])
    expect(moveEditorialRelatedArticle(selected, 0, -1)).toBe(selected)
  })
})
