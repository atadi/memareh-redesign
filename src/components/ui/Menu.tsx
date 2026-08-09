'use client'

import { useState, useEffect } from 'react'
import { Search, BookOpen, User, LogOut, Sun, Moon } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { isAdminUser } from '@/lib/auth-role'

/**
 * Pure derivation of the menu's auth display state from the resolved Supabase
 * user + profile row. Kept side-effect free so it is independently testable
 * without a DOM / Supabase client.
 */
export function deriveAuthState(
  user: { app_metadata?: { role?: unknown } | null } | null,
  displayName: string,
): { isAdmin: boolean; displayName: string } {
  return {
    isAdmin: isAdminUser(user),
    displayName: displayName || 'کاربر',
  }
}

export function Menu() {
  const [user, setUser] = useState<any>(null)
  const [displayName, setDisplayName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { resolvedTheme, setTheme } = useTheme()

  const refreshAuth = async () => {
    const { data } = await supabase.auth.getUser()
    const currentUser = data.user

    if (currentUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', currentUser.id)
        .single()

      setDisplayName(
        profile?.display_name ||
          (currentUser.user_metadata as { display_name?: string })?.display_name ||
          '',
      )
    } else {
      setDisplayName('')
    }

    setUser(currentUser)
    setLoading(false)
  }

  // Initial load.
  useEffect(() => {
    setMounted(true)
    refreshAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the menu in sync with auth state changes (login / logout / session
  // refresh) without requiring a full page reload. This is the fix for the
  // stale-nav defect: the Menu lives in the persistent layout and does not
  // remount on client navigation, so a one-time getUser() left it showing the
  // pre-login state until a manual refresh.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshAuth()
    })
    return () => sub.subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { isAdmin } = deriveAuthState(user, displayName)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setDisplayName('')
    router.refresh()
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const ThemeIcon = mounted && resolvedTheme === 'dark' ? Sun : Moon

  return (
    <div className="flex items-center justify-between w-full">
      <a href="/" className="flex items-center gap-3">
        <img
          src="/assets/logo/logo.svg"
          alt="معماره"
          className="w-28 h-auto dark:hidden"
        />
        <img
          src="/assets/logo/logo-dark.svg"
          alt="معماره"
          className="w-28 h-auto hidden dark:block"
        />
      </a>

      <nav className="hidden md:flex items-center gap-6">
        <Link
          href="/"
          className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md transition-colors duration-200"
        >
          خانه
        </Link>

        <Link
          href="/articles"
          className="inline-flex items-center gap-2 bg-linear-to-r from-yellow-400 to-orange-400 text-white font-semibold px-4 py-2 rounded-xl shadow-md hover:scale-[1.02] transform transition-all"
        >
          <BookOpen className="w-4 h-4" />
          مقالات
        </Link>

        <Link
          href="/search"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/10"
          aria-label="جستجو"
        >
          <Search className="w-4 h-4" />
          جستجو
        </Link>

        <button
          onClick={toggleTheme}
          aria-label={resolvedTheme === 'dark' ? 'روشن کردن تم' : 'تاریک کردن تم'}
          className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
        >
          {mounted ? (
            <ThemeIcon className="w-5 h-5" />
          ) : (
            <span className="block w-5 h-5" />
          )}
        </button>

        {!loading && (
          <>
            {user ? (
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    پنل مدیریت
                  </Link>
                )}
                <Link
                  href="/profile"
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  <User className="w-4 h-4" />
                  {displayName || 'کاربر'}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 transition"
                  aria-label="خروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-sm text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  ورود
                </Link>
                <Link
                  href="/register"
                  className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  ثبت‌نام
                </Link>
              </div>
            )}
          </>
        )}
      </nav>

      <div className="md:hidden flex items-center gap-3">
        <Link href="/articles" className="p-2 bg-yellow-400 rounded-lg shadow-md">
          <BookOpen className="w-5 h-5 text-white" />
        </Link>
        <button
          onClick={toggleTheme}
          aria-label={resolvedTheme === 'dark' ? 'روشن کردن تم' : 'تاریک کردن تم'}
          className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
        >
          {mounted ? (
            <ThemeIcon className="w-5 h-5" />
          ) : (
            <span className="block w-5 h-5" />
          )}
        </button>
        {user && (
          <>
            {isAdmin && (
              <Link href="/admin" className="p-2 bg-blue-100 rounded-lg" aria-label="پنل مدیریت">
                <User className="w-5 h-5 text-blue-600" />
              </Link>
            )}
            <Link href="/profile" className="p-2 bg-gray-100 rounded-lg">
              <User className="w-5 h-5 text-gray-600" />
            </Link>
          </>
        )}
        {!user && !loading && (
          <Link href="/login" className="p-2 bg-blue-100 rounded-lg">
            <User className="w-5 h-5 text-blue-600" />
          </Link>
        )}
      </div>
    </div>
  )
}

export default Menu
