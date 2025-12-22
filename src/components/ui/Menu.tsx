import React from 'react'
import { Search, BookOpen } from 'lucide-react'

export function Menu() {
  return (
    <div className="flex items-center justify-between w-full">
      <a href="/" className="flex items-center gap-3">
        <img src="/assets/logo/logo.png" alt="معماره" className="w-28 h-auto" />
      </a>

      <nav className="hidden md:flex items-center gap-6">
        <a
          href="/"
          className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md transition-colors duration-200"
        >
          خانه
        </a>

        <a
          href="/articles"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-semibold px-4 py-2 rounded-xl shadow-md hover:scale-[1.02] transform transition-all"
        >
          <BookOpen className="w-4 h-4" />
          مقالات
        </a>

        <a
          href="/search"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/10"
          aria-label="جستجو"
        >
          <Search className="w-4 h-4" />
          جستجو
        </a>
      </nav>

      {/* Mobile: compact actions */}
      <div className="md:hidden flex items-center gap-3">
        <a href="/articles" className="p-2 bg-yellow-400 rounded-lg shadow-md">
          <BookOpen className="w-5 h-5 text-white" />
        </a>
      </div>
    </div>
  )
}

export default Menu
