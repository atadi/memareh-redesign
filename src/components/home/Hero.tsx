'use client'

import { motion } from 'framer-motion'
import { Phone, Clock, Shield, Star, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import toast from 'react-hot-toast'

export function Hero() {
  const handlePhoneClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Check if device is desktop (not mobile)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

    if (!isMobile) {
      e.preventDefault()
      toast('شماره تماس اضطراری: ۰۹۱۲۶۷۶۹۰۴۸\nلطفا از موبایل تماس بگیرید', {
        icon: '🚨',
        duration: 4000,
        style: {
          direction: 'rtl',
          textAlign: 'center'
        }
      })
    }
  }
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 min-h-[100vh]">
      {/* Animated Background Effects */}
      <div className="absolute inset-0">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e520_1px,transparent_1px),linear-gradient(to_bottom,#4f46e520_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        {/* Gradient Orbs */}
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Logo Badge - positioned with zero distance from section top and bottom */}
      <div className="absolute top-0 bottom-0 -right-12 md:right-[14.28%] opacity-4 pointer-events-none">
        <Image
          src="/assets/images/walking-man.png"
          alt="معماره - خدمات برقکاری حرفه‌ای"
          width={1000}
          height={3024}
          className="object-cover object-bottom h-full w-auto"
          priority
        />
      </div>

      <div className="relative container mx-auto px-4 py-16 md:py-30">

        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left Side - Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-white space-y-8"
          >
            
            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                برقکار
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500">
                  حرفه‌ای و مجرب
                </span>
                در خدمت شماست
              </h1>
              <p className="text-lg md:text-xl text-gray-300 max-w-xl">
                دسترسی آسان به تکنسین‌های مجاز و با تجربه در تمامی مناطق تهران
              </p>
              <p className="text-lg md:text-xl text-gray-300 max-w-xl">
                خدمات اضطراری ۲۴ ساعته با پاسخگویی بسیار سریع
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
                'ضمانت خدمات',
                'تکنسین‌های مجرب',
                'قیمت شفاف و رقابتی',
                'پشتیبانی سریع'
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
                href="tel:09126769048"
                onClick={handlePhoneClick}
                className="group inline-flex items-center justify-center gap-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold px-8 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-red-500/50 hover:scale-105"
              >
                <Phone className="w-5 h-5 animate-pulse" />
                <span>تماس اضطراری: ۰۹۱۲۶۷۶۹۰۴۸</span>
              </a>
            </div>
          </motion.div>

          {/* Right Side - Map */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative flex items-center justify-center"
          >
            <div className="hidden lg:block w-full max-w-3xl h-[520px] md:h-[640px] rounded-xl overflow-hidden relative isolate">
              {/* Local transparent PNG map (converted) */}
              <img
                src="/assets/areas/tehran_regions_transparent.png"
                alt="نقشه تهران"
                className="w-full h-full object-contain"
              />


            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}