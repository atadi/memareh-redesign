'use client'

import { Check, X, Phone } from 'lucide-react'
import Link from 'next/link'

export function PricingSection() {
  const packages = [
    {
      name: 'بازدید و عیب‌یابی',
      price: '۱۵۰,۰۰۰',
      description: 'برای مشکلات ساده',
      features: [
        'بازدید رایگان در صورت انجام کار',
        'عیب‌یابی تخصصی',
        'ارائه تخمین هزینه',
        'مشاوره رایگان',
      ],
      notIncluded: [
        'قطعات یدکی',
        'خدمات اضطراری'
      ],
      recommended: false
    },
    {
      name: 'خدمات عمومی',
      price: 'توافقی',
      description: 'پرطرفدارترین',
      features: [
        'تمام خدمات بازدید',
        'نصب و تعمیرات',
        'ضمانت ۶ ماهه',
        'قطعات با تخفیف ۱۰٪',
        'اولویت در اعزام تکنسین',
      ],
      notIncluded: [
        'خدمات اضطراری ۲۴ ساعته'
      ],
      recommended: true
    },
    {
      name: 'قرارداد سالیانه',
      price: 'ویژه',
      description: 'برای مجتمع‌ها و کسب‌وکارها',
      features: [
        'تمام خدمات بازدید و عمومی',
        'خدمات اضطراری ۲۴/۷',
        'بازرسی دوره‌ای رایگان',
        'قطعات با تخفیف ۲۰٪',
        'اولویت ویژه در اعزام',
        'بدون هزینه ایاب و ذهاب',
      ],
      notIncluded: [],
      recommended: false
    }
  ]

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">تعرفه خدمات</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            انتخاب بهترین پکیج متناسب با نیاز شما
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {packages.map((pkg, index) => (
            <div
              key={index}
              className={`bg-white rounded-2xl shadow-lg overflow-hidden relative ${
                pkg.recommended ? 'ring-2 ring-blue-500 transform scale-105' : ''
              }`}
            >
              {pkg.recommended && (
                <div className="bg-blue-500 text-white text-center py-2 text-sm font-bold">
                  پیشنهاد ویژه
                </div>
              )}
              
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{pkg.description}</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold">{pkg.price}</span>
                  {pkg.price !== 'توافقی' && pkg.price !== 'ویژه' && (
                    <span className="text-gray-600 mr-2">تومان</span>
                  )}
                </div>
                
                <div className="space-y-3 mb-6">
                  {pkg.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-500 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                  {pkg.notIncluded.map((item, i) => (
                    <div key={i} className="flex items-start gap-2 opacity-60">
                      <X className="w-5 h-5 text-gray-400 mt-0.5" />
                      <span className="text-sm line-through">{item}</span>
                    </div>
                  ))}
                </div>
                
                <Link
                  href="/booking"
                  className={`block text-center py-3 rounded-lg font-medium transition-colors ${
                    pkg.recommended
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  انتخاب پکیج
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            برای دریافت مشاوره رایگان و تعرفه‌های ویژه تماس بگیرید
          </p>
            <a href="tel:02112345678" className="inline-flex items-center gap-2 text-blue-600 font-bold text-lg hover:text-blue-700">
            <Phone className="w-5 h-5" />
            ۰۲۱-۱۲۳۴۵۶۷۸
          </a>
        </div>
      </div>
    </section>
  )
}