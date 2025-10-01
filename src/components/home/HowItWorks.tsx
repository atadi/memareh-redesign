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
    }
  ]

  return (
    <section className="relative overflow-hidden py-16 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-100">نحوه دریافت خدمات</h2>
          <p className="text-gray-200 max-w-2xl mx-auto">
            دریافت خدمات برق‌کاری در 3 مرحله ساده
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={index} className="relative text-center group">
                <div className="relative mb-6">
                  <div className={`${step.color} w-20 h-20 rounded-full flex items-center justify-center mx-auto text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-10 h-10" />
                  </div>
               </div>
                
                <h3 className="text-gray-100 text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-gray-200 text-sm">{step.description}</p>
               
              </div>
            )
          })}
        </div>

        <div className="text-center mt-12">
          <a href="tel:09126769048" className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors">
            درخواست خدمات
            <Phone className="w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  )
}
