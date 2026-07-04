'use client'

import { useEffect, useState } from 'react'
import { Search, Save, Loader2, Users, Mail, Calendar, LogIn } from 'lucide-react'

type AdminUser = {
  id: string
  email: string | null
  display_name: string
  created_at: string
  last_sign_in_at: string | null
}

export function UserModeration() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/users', {
      cache: 'no-store',
      credentials: 'include',
    })
    const json = await res.json()
    setUsers(json.users)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function saveName(id: string, name: string) {
    setSavingId(id)
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: name }),
    })
    await load()
    setSavingId(null)
  }

  const filtered = users.filter((u) =>
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="pt-14 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">مدیریت کاربران</h2>
          <p className="text-gray-500 mt-1">{users.length} کاربر ثبت‌نام شده</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              placeholder="جستجوی ایمیل کاربران..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="mr-3 text-gray-500">در حال بارگذاری کاربران...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Users className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">کاربری یافت نشد</p>
          </div>
        ) : (
          <div>
            {/* Table Header */}
            <div className="grid grid-cols-5 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-100 text-sm font-bold text-gray-600">
              <div className="flex items-center gap-2"><Mail className="w-4 h-4" /> ایمیل</div>
              <div className="flex items-center gap-2"><Users className="w-4 h-4" /> نام نمایشی</div>
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> تاریخ ایجاد</div>
              <div className="flex items-center gap-2"><LogIn className="w-4 h-4" /> آخرین ورود</div>
              <div />
            </div>

            {/* Rows */}
            {filtered.map((user) => (
              <UserRow key={user.id} user={user} onSave={saveName} savingId={savingId} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <p className="text-sm text-gray-400">
            نمایش {filtered.length} از {users.length} کاربر
          </p>
        </div>
      </div>
    </div>
  )
}

function UserRow({
  user,
  onSave,
  savingId,
}: {
  user: AdminUser
  onSave: (id: string, name: string) => Promise<void>
  savingId: string | null
}) {
  const [value, setValue] = useState(user.display_name)
  const isSaving = savingId === user.id

  return (
    <div className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-gray-50 items-center hover:bg-blue-50/30 transition-colors">
      <div className="text-sm text-gray-700 font-medium truncate" dir="ltr">
        {user.email}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      </div>

      <div className="text-sm text-gray-500">
        {new Date(user.created_at).toLocaleDateString('fa-IR')}
      </div>

      <div className="text-sm text-gray-500">
        {user.last_sign_in_at
          ? new Date(user.last_sign_in_at).toLocaleDateString('fa-IR')
          : '—'}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => onSave(user.id, value)}
          disabled={isSaving || value === user.display_name}
          className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? 'در حال ذخیره...' : 'ذخیره'}
        </button>
      </div>
    </div>
  )
}
