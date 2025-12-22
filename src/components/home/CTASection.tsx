'use client'

import { ArrowLeft, Phone, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export function CTASection() {
  const handlePhoneClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Check if device is desktop (not mobile)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

    if (!isMobile) {
      e.preventDefault()
      toast('شماره تماس: ۰۹۱۲۶۷۶۹۰۴۸\nلطفا از موبایل تماس بگیرید', {
        icon: '📱',
        duration: 4000,
        style: {
          direction: 'rtl',
          textAlign: 'center'
        }
      })
    }
  }

  return (
    <section className="py-16 bg-gradient-to-bl from-blue-600 to-blue-800 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            آماده دریافت خدمات برق‌کاری حرفه‌ای هستید؟
          </h2>
          <p className="text-xl mb-8 opacity-90">
            همین حالا درخواست خود را ثبت کنید و از خدمات ما با تخفیف ویژه بهره‌مند شوید
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/articles" className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors inline-flex items-center justify-center gap-2 group">
              مطالعه مقالات
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </a>
            
            
            <a
              href="tel:0989126769048"
              onClick={handlePhoneClick}
              className="bg-transparent border-2 border-white px-8 py-3 rounded-lg font-bold hover:bg-white hover:text-blue-600 transition-colors inline-flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              تماس فوری
            </a>
            
            
            <a href="https://wa.me/989126769048" target="_blank" rel="noopener noreferrer" className="bg-green-500 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-600 transition-colors inline-flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5" />
              واتساپ
            </a>
          </div>
          
          <div className="mt-12 pt-12 border-t border-white/20">
            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-bold mb-1">۲۴/۷</div>
                <div className="text-sm opacity-75">پشتیبانی شبانه‌روزی</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-1">۳۰ دقیقه</div>
                <div className="text-sm opacity-75">میانگین زمان رسیدن</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-1">۱۰۰٪</div>
                <div className="text-sm opacity-75">ضمانت کیفیت</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}