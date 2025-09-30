'use client'

import Link from 'next/link'
import { 
  Zap, 
  Home, 
  Building2, 
  Wrench,
  ShieldCheck,
  Gauge,
  Lightbulb,
  Cable
} from 'lucide-react'

export function ServiceCategories() {
  const categories = [
    {
      title: 'برق‌کاری ساختمان',
      description: 'سیم‌کشی کامل ساختمان‌های مسکونی و تجاری',
      icon: Building2,
      color: 'bg-blue-500',
      href: '/services/building'
    },
    {
      title: 'تعمیرات برق',
      description: 'رفع اتصالی، تعمیر کلید و پریز، تابلو برق',
      icon: Wrench,
      color: 'bg-green-500',
      href: '/services/repair'
    },
    {
      title: 'نصب و راه‌اندازی',
      description: 'نصب کولر، آبگرمکن، لوازم برقی',
      icon: Home,
      color: 'bg-purple-500',
      href: '/services/installation'
    },
    {
      title: 'برق اضطراری',
      description: 'خدمات فوری ۲۴ ساعته رفع قطعی',
      icon: Zap,
      color: 'bg-red-500',
      href: '/services/emergency'
    },
    {
      title: 'بازرسی ایمنی',
      description: 'بازرسی فنی و صدور گواهی ایمنی برق',
      icon: ShieldCheck,
      color: 'bg-yellow-500',
      href: '/services/inspection'
    },
    {
      title: 'برق صنعتی',
      description: 'نصب و تعمیر تجهیزات صنعتی',
      icon: Gauge,
      color: 'bg-indigo-500',
      href: '/services/industrial'
    },
    {
      title: 'روشنایی',
      description: 'طراحی و اجرای سیستم روشنایی',
      icon: Lightbulb,
      color: 'bg-orange-500',
      href: '/services/lighting'
    },
    {
      title: 'شبکه و مخابرات',
      description: 'کابل‌کشی شبکه و سیستم‌های مخابراتی',
      icon: Cable,
      color: 'bg-teal-500',
      href: '/services/network'
    }
  ]

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">خدمات ما</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            ارائه دهنده انواع خدمات برق‌کاری با بیش از ۱۵ سال تجربه و تیم متخصص
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => {
            const Icon = category.icon
            return (
              <Link
                key={index}
                href={category.href}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 group"
              >
                <div className={`${category.color} w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">{category.title}</h3>
                <p className="text-gray-600 text-sm">{category.description}</p>
                <div className="mt-4 text-blue-600 text-sm font-medium group-hover:gap-2 flex items-center transition-all">
                  مشاهده جزئیات
                  <span className="mr-1 group-hover:mr-2 transition-all">←</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}