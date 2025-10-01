'use client'

import { 
  Award, 
  Clock, 
  Shield, 
  Users,
  ThumbsUp,
  Banknote
} from 'lucide-react'

export function WhyChooseUs() {
  const features = [
    {
      icon: Award,
      title: 'تکنسین‌های متخصص',
      description: 'تمام تکنسین‌های ما دارای مدارک معتبر هستند'
    },
    {
      icon: Clock,
      title: 'خدمات ۲۴ ساعته',
      description: 'آماده خدمات‌رسانی در تمام ساعات شبانه‌روز و ایام هفته'
    },
    {
      icon: Shield,
      title: 'ضمانت کیفیت',
      description: 'ضمانت‌ خدمات برای تمام سرویس‌های انجام شده'
    },
    {
      icon: ThumbsUp,
      title: 'رضایت ۹۸٪',
      description: 'بیش از ۹۸ درصد رضایت مشتریان از خدمات ما'
    },
    {
      icon: Banknote,
      title: 'قیمت منصفانه',
      description: 'نرخ‌های رقابتی و شفاف بدون هزینه‌های پنهان'
    }
  ]

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              چرا ما را انتخاب کنید؟
            </h2>
            <p className="text-gray-600 mb-8">
              با بیش از ۱۵ سال تجربه در ارائه خدمات برقکاری، ما به عنوان یکی از معتبرترین 
              مراجع خدمات فنی در تهران شناخته می‌شویم. تعهد ما به کیفیت، ایمنی و رضایت 
              مشتری، ما را به انتخاب اول شما برای تمام نیازهای برقی تبدیل کرده است.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold mb-1">{feature.title}</h3>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          <div className="relative">
            <div className="bg-blue-600 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-6">آمار و دستاوردها</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>پروژه‌های تکمیل شده</span>
                  <span className="text-2xl font-bold">۳,۰۰۰+</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>مشتریان راضی</span>
                  <span className="text-2xl font-bold">۴,۰۰۰+</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>سال‌های فعالیت</span>
                  <span className="text-2xl font-bold">۱۵+</span>
                </div>
              </div>
            </div>
         </div>
        </div>
      </div>
    </section>
  )
}