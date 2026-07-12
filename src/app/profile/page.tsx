'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { User, Mail, LogOut, Save, ArrowRight } from 'lucide-react'
import { revalidateAllArticles } from '@/actions/revalidate'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setUserId(user.id)
    setEmail(user.email || '')

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    setDisplayName(profile?.display_name || user.user_metadata?.display_name || '')
    setLoading(false)
  }

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, display_name: displayName })

    if (error) {
      toast.error('خطا در ذخیره اطلاعات')
    } else {
      toast.success('اطلاعات با موفقیت ذخیره شد')
      // Revalidate all article pages so comments show the updated display name
      try {
        await revalidateAllArticles()
      } catch {
        // ignore revalidation failures
      }
    }

    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('با موفقیت خارج شدید')
    router.push('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-lg mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
              <User className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">پروفایل</h1>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نام نمایشی
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="نام خود را وارد کنید"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ایمیل
              </label>
              <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {email}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'در حال ذخیره...' : 'ذخیره اطلاعات'}
            </button>

            <hr className="border-gray-200" />

            <button
              onClick={handleLogout}
              className="w-full bg-red-50 text-red-600 py-3 rounded-lg font-semibold hover:bg-red-100 transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              خروج از حساب
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition">
              <ArrowRight className="w-4 h-4" />
              بازگشت به صفحه اصلی
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
