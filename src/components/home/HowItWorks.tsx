'use client'

import { Phone, Calendar, UserCheck, CheckCircle } from 'lucide-react'

export function HowItWorks() {
  const steps = [
    {
      number: '۱',
      title: 'تماس یا درخواست آنلاین',
      description: 'از طریق تماس تلفنی یا فرم آنلاین درخواست خود را ثبت کنید',
      icon: Phone,
      color: 'bg-blue-500'
    },
    {
      number: '۲',
      title: 'هماهنگی زمان',
      description: 'تیم ما در اسرع وقت با شما تماس گرفته و زمان مراجعه را هماهنگ می‌کند',
      icon: Calendar,
      color: 'bg-green-500'
    },
    {
      number: '۳',
      title: 'اعزام متخصص',
      description: 'تکنسین مجرب در زمان مقرر در محل حاضر شده و کار را انجام می‌دهد',
      icon: UserCheck,
      color: 'bg-purple-500'
    },
    {
      number: '۴',
      title: 'تضمین کیفیت',
      description: 'تمام خدمات با ضمانت کتبی و پشتیبانی پس از انجام کار ارائه می‌شود',
      icon: CheckCircle,
      color: 'bg-orange-500'
    }
  ]

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">نحوه دریافت خدمات</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            دریافت خدمات برق‌کاری در ۴ مرحله ساده
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={index} className="text-center group">
                <div className="relative mb-6">
                  <div className={`${step.color} w-20 h-20 rounded-full flex items-center justify-center mx-auto text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-10 h-10" />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-white text-gray-800 w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-md">
                    {step.number}
                  </div>
                </div>
                
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
                
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-0 transform translate-x-1/2 w-full">
                    <div className="border-t-2 border-dashed border-gray-300"></div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="text-center mt-12">
          <a href="/booking" className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            درخواست خدمات
            <Phone className="w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  )
}