'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  BookOpen,
  Shield,
  Wrench,
  Lightbulb,
  Cpu,
  Settings,
  Search,
  Filter,
} from 'lucide-react'

const categories = [
  { value: 'all', label: 'همه مقالات', icon: BookOpen },
  { value: 'safety_tips', label: 'نکات ایمنی', icon: Shield },
  { value: 'diy_guide', label: 'آموزش تعمیرات', icon: Wrench },
  { value: 'energy_saving', label: 'صرفه‌جویی انرژی', icon: Lightbulb },
  { value: 'new_tech', label: 'تکنولوژی جدید', icon: Cpu },
  { value: 'maintenance', label: 'نگهداری', icon: Settings },
  { value: 'troubleshooting', label: 'عیب‌یابی', icon: Search },
]

export function ArticlesSidebar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get('category') || 'all'
  const currentSort = searchParams.get('sort') || 'newest'

  const navigate = (params: { category?: string; sort?: string }) => {
    const sp = new URLSearchParams()
    const cat = params.category ?? currentCategory
    const sort = params.sort ?? currentSort
    if (cat && cat !== 'all') sp.set('category', cat)
    if (sort && sort !== 'newest') sp.set('sort', sort)
    const qs = sp.toString()
    router.push(qs ? `/articles?${qs}` : '/articles')
  }

  return (
    <aside className="lg:w-1/4">
      <div className="bg-white rounded-xl shadow-lg p-6 sticky top-[60px]">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5" />
          دسته‌بندی‌ها
        </h2>

        <div className="space-y-2">
          {categories.map((cat) => {
            const Icon = cat.icon
            return (
              <button
                key={cat.value}
                onClick={() => navigate({ category: cat.value })}
                className={`w-full text-right px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${
                  currentCategory === cat.value
                    ? 'bg-blue-100 text-blue-700 font-bold'
                    : 'hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {cat.label}
              </button>
            )
          })}
        </div>

        <div className="mt-8 pt-6 border-t">
          <h3 className="font-bold mb-3">مرتب‌ سازی</h3>
          <select
            value={currentSort}
            onChange={(e) => navigate({ sort: e.target.value })}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="newest">جدیدترین</option>
            <option value="popular">پربازدیدترین</option>
            <option value="rating">بالاترین امتیاز</option>
          </select>
        </div>
      </div>
    </aside>
  )
}
