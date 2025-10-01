'use client'

import { useState } from 'react'
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react'
import Image from 'next/image'

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const testimonials = [
    {
      name: 'احمد رضایی',
      role: 'مدیر ساختمان مسکونی',
      content: 'خدمات بسیار عالی و حرفه‌ای. تکنسین‌ها به موقع رسیدند و کار را با کیفیت بالا انجام دادند. قیمت‌ها هم منصفانه بود.',
      rating: 5,
      image: '/assets/avatars/1.jpg',
      initials: '',
      bgColor: 'bg-blue-500'
    },
    {
      name: 'مریم محمدی',
      role: 'صاحب کسب و کار',
      content: 'برای برق‌کشی مغازه جدیدم از خدمات این شرکت استفاده کردم. کار بسیار تمیز و اصولی انجام شد. واقعا راضی هستم.',
      rating: 5,
      image: '/assets/avatars/2.jpg',
      initials: '',
      bgColor: 'bg-purple-500'
    },
    {
      name: 'علی حسینی',
      role: 'مالک آپارتمان',
      content: 'سرعت عمل در رفع اتصالی برق واحدم عالی بود. کمتر از یک ساعت تکنسین اومد و مشکل رو حل کرد. ممنون از خدمات اضطراری‌تون.',
      rating: 5,
      image: '/assets/avatars/3.jpg',
      initials: '',
      bgColor: 'bg-green-500'
    }
  ]

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  return (
    <section className="py-16 relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      
      {/* Animated Background Effects */}
      <div className="absolute inset-0">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e520_1px,transparent_1px),linear-gradient(to_bottom,#4f46e520_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        {/* Gradient Orbs */}
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl text-gray-100 md:text-4xl font-bold mb-4">نظرات مشتریان</h2>
          <p className="text-gray-200 max-w-2xl mx-auto">
            رضایت مشتریان، بزرگترین سرمایه ما است
          </p>
        </div>

        <div className="max-w-4xl mx-auto relative">
          <div className="bg-white rounded-2xl p-8 md:p-12 shadow-xl border border-gray-100">
            <Quote className="w-12 h-12 text-blue-200 mb-6" />
            
            <div className="mb-8">
              <p className="text-lg text-gray-700 leading-relaxed">
                "{testimonials[currentIndex].content}"
              </p>
            </div>
            
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                {/* Avatar with fallback */}
                <div className="relative">
                  <div className={`w-16 h-16 rounded-full overflow-hidden ${testimonials[currentIndex].bgColor} flex items-center justify-center shadow-lg`}>
                    <Image
                      src={testimonials[currentIndex].image}
                      alt={testimonials[currentIndex].name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                    {/* Fallback initials (hidden by default, shown if image fails) */}
                    <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white">
                      {testimonials[currentIndex].initials}
                    </span>
                  </div>
                  {/* Verified badge */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-bold text-lg">{testimonials[currentIndex].name}</h4>
                  <p className="text-sm text-gray-600 mb-1">{testimonials[currentIndex].role}</p>
                  <div className="flex gap-1">
                    {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={prevTestimonial}
                  className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  aria-label="نظر قبلی"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={nextTestimonial}
                  className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                  aria-label="نظر بعدی"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentIndex ? 'bg-blue-600 w-8' : 'bg-gray-300 w-2'
                }`}
                aria-label={`نمایش نظر ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
