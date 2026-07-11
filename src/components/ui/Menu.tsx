'use client'

import { useState, useEffect } from 'react'
import { Search, BookOpen, User, LogOut } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function Menu() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.refresh()
  }

  return (
    <div className="flex items-center justify-between w-full">
      <a href="/" className="flex items-center gap-3">
        <img src="/assets/logo/logo.png" alt="معماره" className="w-28 h-auto" />
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

        {!loading && (
          <>
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  <User className="w-4 h-4" />
                  {user.user_metadata?.display_name || 'کاربر'}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 transition"
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
        {user && (
          <Link href="/profile" className="p-2 bg-gray-100 rounded-lg">
            <User className="w-5 h-5 text-gray-600" />
          </Link>
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
