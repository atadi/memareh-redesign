'use client'

import { useState } from 'react'
import { 
  Filter, 
  Search,
  Calendar,
  Tag,
  TrendingUp,
  Clock,
  Star,
  X
} from 'lucide-react'

interface ArticleFiltersProps {
  onFilterChange?: (filters: FilterOptions) => void
  onSearchChange?: (search: string) => void
  onSortChange?: (sort: SortOption) => void
}

export interface FilterOptions {
  category: string
  tags: string[]
  dateRange: {
    from: Date | null
    to: Date | null
  }
  hasVideo: boolean
}

export type SortOption = 'newest' | 'oldest' | 'popular' | 'rating'

export function ArticleFilters({ 
  onFilterChange, 
  onSearchChange, 
  onSortChange 
}: ArticleFiltersProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const categories = [
    { value: 'all', label: 'همه مقالات' },
    { value: 'safety_tips', label: 'نکات ایمنی' },
    { value: 'diy_guide', label: 'آموزش تعمیرات' },
    { value: 'energy_saving', label: 'صرفه‌جویی انرژی' },
    { value: 'new_tech', label: 'تکنولوژی جدید' },
    { value: 'maintenance', label: 'نگهداری' },
    { value: 'troubleshooting', label: 'عیب‌یابی' },
    { value: 'regulations', label: 'قوانین و مقررات' },
    { value: 'case_studies', label: 'مطالعات موردی' }
  ]

  const popularTags = [
    'برق منزل',
    'ایمنی',
    'صرفه‌جویی',
    'تعمیرات',
    'آموزش',
    'نکات کاربردی',
    'برق صنعتی',
    'روشنایی',
    'کولر',
    'سیم‌کشی'
  ]

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    onSearchChange?.(value)
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    onFilterChange?.({
      category,
      tags: selectedTags,
      dateRange: { from: null, to: null },
      hasVideo: false
    })
  }

  const handleTagToggle = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag]
    
    setSelectedTags(newTags)
    onFilterChange?.({
      category: selectedCategory,
      tags: newTags,
      dateRange: { from: null, to: null },
      hasVideo: false
    })
  }

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort)
    onSortChange?.(sort)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCategory('all')
    setSelectedTags([])
    setSortBy('newest')
    onSearchChange?.('')
    onFilterChange?.({
      category: 'all',
      tags: [],
      dateRange: { from: null, to: null },
      hasVideo: false
    })
    onSortChange?.('newest')
  }

  const hasActiveFilters = 
    searchTerm !== '' || 
    selectedCategory !== 'all' || 
    selectedTags.length > 0 ||
    sortBy !== 'newest'

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="جستجو در مقالات..."
            className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => handleSearch('')}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2">
            <Filter className="w-5 h-5" />
            فیلترها
          </h3>
          
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              پاک کردن فیلترها
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            دسته‌بندی
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => handleCategoryChange(cat.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            برچسب‌ها
          </label>
          <div className="flex flex-wrap gap-2">
            {popularTags.map(tag => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Tag className="inline w-3 h-3 ml-1" />
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            مرتب‌سازی
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => handleSortChange('newest')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                sortBy === 'newest'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              جدیدترین
            </button>
            <button
              onClick={() => handleSortChange('oldest')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                sortBy === 'oldest'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              قدیمی‌ترین
            </button>
            <button
              onClick={() => handleSortChange('popular')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                sortBy === 'popular'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              پربازدید
            </button>
            <button
              onClick={() => handleSortChange('rating')}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                sortBy === 'rating'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Star className="w-4 h-4" />
              بالاترین امتیاز
            </button>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showAdvancedFilters ? 'بستن فیلترهای پیشرفته' : 'فیلترهای پیشرفته'}
        </button>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  از تاریخ
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تا تاریخ
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded" />
                <span className="text-sm">فقط مقالات دارای ویدیو</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {(selectedTags.length > 0 || selectedCategory !== 'all') && (
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-sm font-medium text-blue-700">فیلترهای فعال:</span>
            
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full text-xs">
                دسته‌بندی: {categories.find(c => c.value === selectedCategory)?.label}
                <button
                  onClick={() => handleCategoryChange('all')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            
            {selectedTags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-full text-xs">
                {tag}
                <button
                  onClick={() => handleTagToggle(tag)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}