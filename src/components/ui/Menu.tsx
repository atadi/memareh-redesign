'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Sun, Moon } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import Button from '@/components/ui/Button'

/**
 * Public site navigation.
 *
 * Delivery note: authentication and admin entry points are intentionally NOT
 * exposed here. The /login, /register, /profile and /admin routes still exist
 * and are reachable directly, but the public header is reserved for consumer
 * navigation and must not advertise internal/auth areas.
 */
export function Menu() {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const ThemeIcon = mounted && resolvedTheme === 'dark' ? Sun : Moon

  return (
    <div className="flex items-center justify-between w-full">
      <a href="/" className="flex items-center gap-3" aria-label="معماره - صفحه اصلی">
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

      <nav className="hidden md:flex items-center gap-6" aria-label="منوی اصلی">
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
          <BookOpen className="w-4 h-4" />مقالات
        </Link>

        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          aria-label={mounted && resolvedTheme === 'dark' ? 'روشن کردن تم' : 'تاریک کردن تم'}
          className="p-2"
        >
          {mounted ? (
            <ThemeIcon className="w-5 h-5" />
          ) : (
            <span className="block w-5 h-5" />
          )}
        </Button>
      </nav>

      <div className="md:hidden flex items-center gap-3" aria-label="منوی اصلی (موبایل)">
        <Link
          href="/articles"
          className="p-2 bg-yellow-400 rounded-lg shadow-md"
          aria-label="مقالات"
        >
          <BookOpen className="w-5 h-5 text-white" />
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          aria-label={mounted && resolvedTheme === 'dark' ? 'روشن کردن تم' : 'تاریک کردن تم'}
          className="p-2"
        >
          {mounted ? (
            <ThemeIcon className="w-5 h-5" />
          ) : (
            <span className="block w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  )
}

export default Menu