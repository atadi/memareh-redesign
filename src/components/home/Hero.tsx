'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Zap, Phone, Clock, Shield, MapPin, Star, ArrowRight, CheckCircle } from 'lucide-react'
import Image from 'next/image'

export function Hero() {
  const [city, setCity] = useState('')
  const [serviceType, setServiceType] = useState('')
  const router = useRouter()

  const handleQuickBooking = () => {
    router.push(`/booking?city=${city}&service=${serviceType}`)
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 min-h-[90vh]">
      {/* Animated Background Effects */}
      <div className="absolute inset-0">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e520_1px,transparent_1px),linear-gradient(to_bottom,#4f46e520_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        {/* Gradient Orbs */}
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      <div className="relative container mx-auto px-4 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side - Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-white space-y-8"
          >
            {/* Logo Badge - Now it will scale based on width/height you set! */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Image
                src="/assets/logo/logo-reverse.png"
                alt="معماره - خدمات برق‌کاری حرفه‌ای"
                width={350}
                height={118}
                className="w-auto h-auto max-w-sm"
                priority
              />
            </motion.div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                برق‌کار
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500">
                  حرفه‌ای و مجرب
                </span>
                در خدمت شماست
              </h1>
              <p className="text-lg md:text-xl text-gray-300 max-w-xl">
                دسترسی آسان به بیش از ۵۰۰ تکنسین مجاز و با تجربه در سراسر کشور. خدمات اضطراری ۲۴ ساعته با پاسخگویی زیر ۱ ساعت.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 backdrop-blur-sm flex items-center justify-center border border-blue-400/30">
                  <Clock className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">۲۴/۷</div>
                  <div className="text-sm text-gray-400">پشتیبانی</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-500/20 backdrop-blur-sm flex items-center justify-center border border-green-400/30">
                  <Shield className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">۱۵+</div>
                  <div className="text-sm text-gray-400">سال تجربه</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 backdrop-blur-sm flex items-center justify-center border border-yellow-400/30">
                  <Star className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">۴.۹</div>
                  <div className="text-sm text-gray-400">امتیاز کاربران</div>
                </div>
              </div>
            </div>

            {/* Features List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                'ضمانت کتبی خدمات',
                'تکنسین‌های مجاز',
                'قیمت شفاف و رقابتی',
                'پشتیبانی اختصاصی'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-gray-300">{feature}</span>
                </div>
              ))}
            </div>

            {/* Emergency CTA */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="tel:09129636605"
                className="group inline-flex items-center justify-center gap-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold px-8 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-red-500/50 hover:scale-105"
              >
                <Phone className="w-5 h-5 animate-pulse" />
                <span>تماس اضطراری: ۰۹۱۲-۹۶۳۶۶۰۵</span>
              </a>
            </div>
          </motion.div>

          {/* Right Side - Booking Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            {/* Floating Card */}
            <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
              {/* Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur-2xl opacity-20 group-hover:opacity-30 transition" />
              
              <div className="relative space-y-6">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-white mb-2">
                    رزرو آنلاین برق‌کار
                  </h2>
                  <p className="text-gray-300">
                    در چند ثانیه تکنسین خود را پیدا کنید
                  </p>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  {/* City Selection */}
                  <div>
                    <label className="block text-white font-medium mb-2 text-right">
                      <MapPin className="inline w-4 h-4 ml-1" />
                      شهر
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-4 py-3.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition appearance-none"
                    >
                      <option value="" className="bg-slate-800">انتخاب شهر...</option>
                      <option value="tehran" className="bg-slate-800">تهران</option>
                      <option value="karaj" className="bg-slate-800">کرج</option>
                      <option value="isfahan" className="bg-slate-800">اصفهان</option>
                      <option value="mashhad" className="bg-slate-800">مشهد</option>
                      <option value="shiraz" className="bg-slate-800">شیراز</option>
                      <option value="tabriz" className="bg-slate-800">تبریز</option>
                    </select>
                  </div>

                  {/* Service Type */}
                  <div>
                    <label className="block text-white font-medium mb-2 text-right">
                      <Zap className="inline w-4 h-4 ml-1" />
                      نوع خدمات
                    </label>
                    <select
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value)}
                      className="w-full px-4 py-3.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition appearance-none"
                    >
                      <option value="" className="bg-slate-800">انتخاب خدمات...</option>
                      <option value="emergency" className="bg-slate-800">⚡ اضطراری - رفع قطعی برق</option>
                      <option value="installation" className="bg-slate-800">🔧 نصب و راه‌اندازی</option>
                      <option value="repair" className="bg-slate-800">🛠️ تعمیرات</option>
                      <option value="wiring" className="bg-slate-800">🏗️ سیم‌کشی ساختمان</option>
                      <option value="inspection" className="bg-slate-800">✅ بازرسی فنی</option>
                    </select>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleQuickBooking}
                    className="w-full group bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-2"
                  >
                    <span>مشاهده برق‌کاران موجود</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                {/* Trust Badge */}
                <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span>تضمین بازگشت وجه در صورت عدم رضایت</span>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">۵۰۰+</div>
                    <div className="text-xs text-gray-400">تکنسین</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">۱۰K+</div>
                    <div className="text-xs text-gray-400">پروژه</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">۹۸٪</div>
                    <div className="text-xs text-gray-400">رضایت</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-6 -right-6 w-20 h-20 bg-yellow-400/20 rounded-full blur-2xl animate-pulse" />
            <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-blue-400/20 rounded-full blur-2xl animate-pulse animation-delay-2000" />
          </motion.div>

        </div>
      </div>

      {/* Animated Lightning Bolt */}
      <div className="absolute top-1/4 left-1/4 opacity-10">
        <Zap className="w-32 h-32 text-yellow-400 animate-pulse" />
      </div>
    </section>
  )
}
