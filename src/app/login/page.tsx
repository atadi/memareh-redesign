'use client'

// Login is session-dependent; opt out of static prerendering so auth state and
// the `next` return-url (useSearchParams) resolve at request time.
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { LogIn, Mail, Lock } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // If user is already signed in, send them to the right place (no login form).
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user
      if (!user) return
      if (user.app_metadata?.role === 'admin') {
        router.replace('/admin')
      } else {
        router.replace('/')
      }
    })
  }, [router, supabase])

  const destinationFor = (role: unknown, next: string | null): string => {
    if (role === 'admin') return '/admin'
    // Safe internal return URL only; reject external redirects.
    if (next && next.startsWith('/') && !next.startsWith('//')) return next
    return '/'
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          toast.error('ایمیل شما تایید نشده است. لطفاً ایمیل خود را بررسی کنید.')
        } else {
          toast.error('ایمیل یا رمز عبور اشتباه است')
        }
        return
      }

      toast.success('با موفقیت وارد شدید')
      const { data: me } = await supabase.auth.getUser()
      const next = searchParams.get('next')
      router.push(destinationFor(me.user?.app_metadata?.role, next))
      router.refresh()
    } catch {
      toast.error('خطای غیرمنتظره')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <LogIn className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ورود</h1>
          <p className="text-gray-600">برای ارسال نظر و استفاده از امکانات وارد شوید</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              ایمیل
            </label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              رمز عبور
            </label>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'در حال ورود...' : 'ورود'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <Link href="/register" className="block text-sm text-blue-600 hover:text-blue-700 font-medium transition">
            حساب ندارید؟ ثبت‌نام
          </Link>
          <Link href="/" className="block text-sm text-gray-600 hover:text-gray-900 transition">
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" />}>
      <LoginForm />
    </Suspense>
  )
}
