'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Zap, Phone, Clock, Shield, MapPin } from 'lucide-react'

export function Hero() {
  const [city, setCity] = useState('')
  const [serviceType, setServiceType] = useState('')
  const router = useRouter()

  const handleQuickBooking = () => {
    router.push(`/booking?city=${city}&service=${serviceType}`)
  }

  return (
    <section className="relative min-h-[700px] bg-gradient-to-bl from-blue-900 via-blue-800 to-blue-900">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Main Title */}
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="text-yellow-400">برق‌کار مجاز</span> و مطمئن
              <br />
              در سراسر شهر شما
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl mb-8 opacity-90">
              خدمات برق‌کاری برای منازل، مشاغل و ساختمان‌ها
              <br />
              با بیش از ۱۵ سال تجربه و ۵۰۰+ تکنسین متخصص
            </p>

            {/* Emergency Notice */}
            <div className="bg-red-600 bg-opacity-90 rounded-lg p-3 mb-8 inline-flex items-center gap-2">
              <Phone className="w-5 h-5 animate-pulse" />
              <span className="font-bold">خدمات اضطراری ۲۴ ساعته: ۰۲۱-۱۲۳۴۵۶۷۸</span>
            </div>
          </motion.div>

          {/* Quick Booking Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 text-gray-800"
          >
            <h2 className="text-2xl font-bold mb-4">رزرو سریع خدمات برق‌کاری</h2>
            
            <div className="grid md:grid-cols-3 gap-4">
              {/* City Selection */}
              <div className="text-right">
                <label className="block text-sm font-medium mb-2">
                  <MapPin className="inline w-4 h-4 ml-1" />
                  شهر محل خدمات
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">انتخاب شهر...</option>
                  <option value="tehran">تهران</option>
                  <option value="karaj">کرج</option>
                  <option value="isfahan">اصفهان</option>
                  <option value="mashhad">مشهد</option>
                  <option value="shiraz">شیراز</option>
                  <option value="tabriz">تبریز</option>
                </select>
              </div>

              {/* Service Type */}
              <div className="text-right">
                <label className="block text-sm font-medium mb-2">
                  <Zap className="inline w-4 h-4 ml-1" />
                  نوع خدمات
                </label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">انتخاب خدمات...</option>
                  <option value="emergency">اضطراری - رفع قطعی برق</option>
                  <option value="installation">نصب و راه‌اندازی</option>
                  <option value="repair">تعمیرات</option>
                  <option value="wiring">سیم‌کشی ساختمان</option>
                  <option value="inspection">بازرسی فنی</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="flex items-end">
                <button
                  onClick={handleQuickBooking}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  درخواست برق‌کار
                </button>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">۱۵+</div>
                <div className="text-sm text-gray-600">سال تجربه</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">۵۰۰+</div>
                <div className="text-sm text-gray-600">تکنسین مجاز</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">۲۴/۷</div>
                <div className="text-sm text-gray-600">پشتیبانی</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">۹۸٪</div>
                <div className="text-sm text-gray-600">رضایت مشتری</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Floating Icons Animation */}
      <div className="absolute top-20 right-10 animate-float">
        <Zap className="w-12 h-12 text-yellow-400 opacity-20" />
      </div>
      <div className="absolute bottom-20 left-10 animate-float-delayed">
        <Shield className="w-12 h-12 text-green-400 opacity-20" />
      </div>
    </section>
  )
}