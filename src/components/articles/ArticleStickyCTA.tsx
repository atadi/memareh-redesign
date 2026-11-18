'use client'

import Link from 'next/link'
import { Home, BookOpen, Phone, MessageCircle } from 'lucide-react'
import { SITE_TEL_HREF, SITE_WHATSAPP_HREF } from '@/lib/site'

/**
 * Compact article-specific sticky navigation + conversion CTA.
 *
 * Replaces the global Menu only on article detail pages (/articles/[slug]).
 * Answers the reader's question "What can I do next while reading?" with:
 * return home, return to articles, contact Memareh.
 */
export function ArticleStickyCTA() {
  return (
    <nav
      aria-label="ناوبری مقاله"
      className="flex items-center justify-between gap-2 w-full"
    >
      {/* Navigation side */}
      <div className="flex items-center gap-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl px-2 sm:px-2.5 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors dark:text-gray-200 dark:hover:bg-gray-800"
          aria-label="صفحه اصلی"
        >
          <Home className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">خانه</span>
        </Link>
        <Link
          href="/articles"
          className="inline-flex items-center gap-1.5 rounded-xl px-2 sm:px-2.5 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600 transition-colors dark:text-gray-200 dark:hover:bg-gray-800"
          aria-label="بازگشت به مقالات"
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">مقالات</span>
        </Link>
      </div>

      {/* Conversion CTA side */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <span className="hidden lg:inline text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          نیاز به برقکار دارید؟
        </span>
        <a
          href={SITE_TEL_HREF}
          className="inline-flex items-center gap-1.5 rounded-xl bg-linear-to-r from-yellow-400 to-orange-400 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:scale-[1.02] transition-transform"
          aria-label="تماس فوری با معماره"
        >
          <Phone className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">تماس فوری</span>
          <span className="sm:hidden">تماس</span>
        </a>
        <a
          href={SITE_WHATSAPP_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-green-500/30 bg-green-50 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium text-green-700 hover:bg-green-100 transition-colors dark:bg-green-900/20 dark:text-green-300"
          aria-label="واتساپ معماره"
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span className="hidden lg:inline">واتساپ</span>
        </a>
      </div>
    </nav>
  )
}

export default ArticleStickyCTA