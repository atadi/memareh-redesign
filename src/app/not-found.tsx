import Link from 'next/link'
import type { Metadata } from 'next'

// 404 responses must stay out of the index. Without this, the root layout's
// `robots: { index: true, follow: true }` metadata is inherited by the
// not-found page, emitting a conflicting `index, follow` directive on a 404.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center bg-background text-foreground px-4">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="text-xl mb-8">صفحه مورد نظر یافت نشد</p>
      <Link
        href="/"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        بازگشت به صفحه اصلی
      </Link>
    </div>
  )
}
