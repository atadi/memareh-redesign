'use client'

import { useState } from 'react'
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react'

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const testimonials = [
    {
      name: 'احمد رضایی',
      role: 'مدیر ساختمان مسکونی',
      content: 'خدمات بسیار عالی و حرفه‌ای. تکنسین‌ها به موقع رسیدند و کار را با کیفیت بالا انجام دادند. قیمت‌ها هم منصفانه بود.',
      rating: 5,
      image: '/avatars/1.jpg'
    },
    {
      name: 'مریم محمدی',
      role: 'صاحب کسب و کار',
      content: 'برای برق‌کشی مغازه جدیدم از خدمات این شرکت استفاده کردم. کار بسیار تمیز و اصولی انجام شد. واقعا راضی هستم.',
      rating: 5,
      image: '/avatars/2.jpg'
    },
    {
      name: 'علی حسینی',
      role: 'مالک آپارتمان',
      content: 'سرعت عمل در رفع اتصالی برق واحدم عالی بود. کمتر از یک ساعت تکنسین اومد و مشکل رو حل کرد. ممنون از خدمات اضطراری‌تون.',
      rating: 5,
      image: '/avatars/3.jpg'
    }
  ]

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">نظرات مشتریان</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            رضایت مشتریان، بزرگترین سرمایه ما است
          </p>
        </div>

        <div className="max-w-4xl mx-auto relative">
          <div className="bg-gray-50 rounded-2xl p-8 md:p-12">
            <Quote className="w-12 h-12 text-blue-200 mb-6" />
            
            <div className="mb-8">
              <p className="text-lg text-gray-700 leading-relaxed">
                {testimonials[currentIndex].content}
              </p>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-600">
                    {testimonials[currentIndex].name[0]}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold">{testimonials[currentIndex].name}</h4>
                  <p className="text-sm text-gray-600">{testimonials[currentIndex].role}</p>
                  <div className="flex gap-1 mt-1">
                    {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={prevTestimonial}
                  className="p-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={nextTestimonial}
                  className="p-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
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
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex ? 'bg-blue-600 w-8' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}