'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  FileText,
  TrendingUp,
  Settings,
  AlertCircle,
  Calendar,
  DollarSign,
  UserCheck,
  Newspaper
} from 'lucide-react'
import { CommentModeration } from '@/components/admin/CommentModeration'

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('overview')
  const router = useRouter()

  const menuItems = [
    { id: 'users', label: 'کاربران', icon: Users, isLink: true, href: '/admin/users' },
    { id: 'articles', label: 'مقالات', icon: Newspaper, isLink: true, href: '/admin/articles' },
    { id: 'comments', label: 'مدیریت نظرات', icon: Newspaper, isLink: true, href: '/admin/comments' },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white">
        <div className="p-6">
          <h1 className="text-2xl font-bold">پنل مدیریت</h1>
        </div>
        
        <nav className="mt-6">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.isLink && item.href) {
                    router.push(item.href)
                  } else {
                    setActiveSection(item.id)
                  }
                }}
                className={`w-full flex items-center gap-3 px-6 py-3 hover:bg-gray-800 transition-colors ${
                  activeSection === item.id ? 'bg-blue-600' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {/* {activeSection === 'overview' && <DashboardStats />} */}
        </div>
      </main>
    </div>
  )
}