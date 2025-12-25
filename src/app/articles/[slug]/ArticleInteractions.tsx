'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Share2, Printer } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ArticleInteractions({
  articleId,
}: {
  articleId: string
}) {
  const supabase = createClient()
  const router = useRouter()

  // Track article view
  useEffect(() => {
    const trackView = async () => {
      try {
        await supabase.rpc('increment_article_view', {
          article_uuid: articleId,
        })
      } catch {
        // Safe to ignore
      }
    }

    trackView()
  }, [articleId, supabase])

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/articles')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: document.title,
        url: window.location.href,
      })
    }
  }

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {/* Back */}
      <button
        onClick={handleBack}
        className="
          inline-flex items-center gap-2
          rounded-lg border border-border
          bg-background px-4 py-2
          text-sm font-medium
          transition
          hover:bg-accent hover:text-accent-foreground
          focus:outline-none focus:ring-2 focus:ring-ring
        "
      >
        <ArrowRight className="h-4 w-4" />
        بازگشت
      </button>

      {/* Share */}
      <button
        onClick={handleShare}
        className="
          inline-flex items-center gap-2
          rounded-lg border border-border
          bg-background px-4 py-2
          text-sm font-medium
          transition
          hover:bg-accent hover:text-accent-foreground
          focus:outline-none focus:ring-2 focus:ring-ring
        "
      >
        <Share2 className="h-4 w-4" />
        اشتراک‌گذاری
      </button>

      {/* Print */}
      <button
        onClick={() => window.print()}
        className="
          inline-flex items-center gap-2
          rounded-lg border border-border
          bg-background px-4 py-2
          text-sm font-medium
          transition
          hover:bg-accent hover:text-accent-foreground
          focus:outline-none focus:ring-2 focus:ring-ring
        "
      >
        <Printer className="h-4 w-4" />
        چاپ
      </button>
    </div>
  )
}
