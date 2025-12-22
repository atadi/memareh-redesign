'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import toast from 'react-hot-toast'
import { LogOut, Home } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check for login page
      if (pathname === '/admin/login') {
        setIsAuthChecking(false)
        setIsAuthenticated(true)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error('لطفا ابتدا وارد شوید')
        setIsAuthChecking(false)
        setIsAuthenticated(false)
        router.push('/admin/login')
        return
      }

      setIsAuthenticated(true)
      setIsAuthChecking(false)
    }

    checkAuth()
  }, [pathname, router, supabase])

  // Handle logout
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      toast.error('خطا در خروج')
      return
    }

    toast.success('با موفقیت خارج شدید')
    router.push('/admin/login')
    router.refresh()
  }

  // Show loading while checking authentication
  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بررسی احراز هویت...</p>
        </div>
      </div>
    )
  }

  // Don't render content if not authenticated (will redirect to login)
  if (!isAuthenticated && pathname !== '/admin/login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">دسترسی غیرمجاز. در حال انتقال به صفحه ورود...</p>
        </div>
      </div>
    )
  }

  // If on login page, just show the login page without admin header
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  // Render admin layout with header for authenticated users
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">
              پنل مدیریت
            </h1>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <Home className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">بازگشت به سایت</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">خروج</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
