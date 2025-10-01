'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, Zap, ArrowUpRight } from 'lucide-react'

export function ServiceCategories() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  const categories = [
    {
      title: 'رفع اتصالی و عیب یابی برق ساختمان',
      description: 'قبل از هر اقدامی، برق ساختمان را قطع کنید تا از خطر برق‌گرفتگی جلوگیری شود. فیوزها، کلیدها، پریزها، سیم‌ها و اتصالات و دستگاه‌های برقی را بررسی کنید. اگر سوختگی یا آسیب دیدگی مشاهده کردید، باید رفع شوند.',
      image: '/assets/images/service1.png'
    },
    {
      title: 'سیم کشی و برقکاری ساختمان',
      description: 'سیم کشی ساختمان در یک تقسیم بندی کلی به دو شیوه روکار و توکار انجام می‌شود که برای انجام دادن هر کدام از آن‌ها باید مراحل خاصی را طی کنید. سیم کشی روکار به نوعی از سیم کشی گفته می‌شود که سیم‌ها از روی گچ دیوار و به صورت آزاد عبور داده می‌شوند.',
      image: '/assets/images/service2.png'
    },
    {
      title: 'رفع فوری مشکلات سیم‌کشی تلفن',
      description: 'امروزه تلفن ثابت یکی از ضروری ترین وسایل ارتباطی است که قطع شدن آن می تواند بسیاری از کارهای ما را در دنیای ارتباطات با مشکل مواجه کند. کارشناسان معماره آماده‌اند تا در کوتاه‌ترین زمان ممکن، خرابی سیم‌کشی داخلی تلفن شما را برطرف کنند.',
      image: '/assets/images/service3.png'
    },
    {
      title: 'نصب و تعمیر انواع کلید و پریز',
      description: 'نصب کلید و پریز در عین حال که کار مشکلی نیست، باید با دقت انجام شود و تمام نکات ایمنی در حین نصب آن مورد توجه قرار بگیرد. از جمله موارد شایع اتصالی‌ها و خطرات برق‌گرفتگی به عایق نبودن کلید و پریزها می‌توان اشاره کرد.',
      image: '/assets/images/service4.png'
    },
    {
      title: 'قطعی و پریدگی فیوز',
      description: 'در بعضی از موارد پریدن فیوز برق باعث ایجاد مشکل نمی‌شود و حتی می‌تواند از ایجاد مشکلات بزرگ‌تر نیز پیشگیری نماید. باید حتماً دلیل ایجاد این مشکل را پیدا کنید و آن را برطرف نمایید تا از مشکلات بزرگتر آتی جلوگیری شود.',
      image: '/assets/images/service5.png'
    },
    {
      title: 'برقکاری صنعتی',
      description: 'در تعریف برق صنعتی اینطور می‌توان گفت که به کنترل و مصرف انرژی الکتریکی در یک کارگاه یا کارخانه صنعتی، گفته می‌شود. تکنیک‌ها و روش‌هایی که برای نظارت و استفاده از برق در صنعت استفاده می‌شود.',
      image: '/assets/images/service6.png'
    },
    {
      title: 'نصب لوستر و هالوژن',
      description: 'اگر برای خانه خودتان لوستر خریدید، آن را به برقکاران ما بسپارید تا با استانداردهای ایمنی، مراحل تست، نصب و تحویل روشنایی به شما داده شود. ما تمامی خدمات برق منزل شما را با در نظر گرفتن نهایت ایمنی در عین سرعت عمل انجام می‌دهیم.',
      image: '/assets/images/service7.png'
    },
    {
      title: 'نصب و تعمیر انواع آیفون های تصویری',
      description: 'با پیشرفت تکنولوژی، افراد زیادی به دنبال نصب و تعمیر آیفون تصویری هستند. ما بهترین برقکاران تهران که همگی در زمینه نصب و تعمیر آیفون صوتی و تصویری مهارت دارند را با یک تماس به محل شما اعزام میکنیم.',
      image: '/assets/images/service8.png'
    },
    {
      title: 'سیم کشی و نصب دزدگیر ساختمان',
      description: 'یکی از بهترین دستاوردهای تکنولوژی در چند سال اخیر سیستم‌های دزدگیر اماکن می‌باشد که باعث از بین رفتن مشکلات و دغدغه‌های بسیاری شده است. وظیفه اصلی سیستم‌های دزدگیر اماکن گزارش ورود‌های و خروج‌های غیرمجاز است.',
      image: '/assets/images/service9.png'
    },        
    {
      title: 'دوربین مدار بسته',
      description: 'اجرای دوربین مداربسته به یکی از تجهیزات بسیار ضروری برای انواع مغازه‌ها و ساختمان‌ها تبدیل شده است. با ما تماس بگیرید تا بهترین تعمیرکاران و پشتیبان‌های دوربین مداربسته را برای نصب و راه‌اندازی برای شما اعزام کنیم.',
      image: '/assets/images/service10.png'
    },
    {
      title: 'کولر های گازی و اسپیلت',
      description: 'در فصل زمستان و بهار خیالتان از بابت نصب و راه اندازی کولر گازی و اسپیلیت راحت باشد. کارشاناسان فنی ما در معماره، از صفر تا 100 نصب و اجرا و در نهایت تست کولر گازی و اسپلیت را با استاندارد جهانی پیاده سازی می‌کنند.',
      image: '/assets/images/service11.png'
    },
    {
      title: 'نصب و راه‌اندازی خانه‌ی هوشمند',
      description: 'در دنیای امروز، خانه‌های هوشمند به سرعت در حال گسترش هستند. نصب و راه‌اندازی خانه هوشمند می‌تواند چالش‌ برانگیز باشد، اما با روش مناسب و پیروی از مراحل اصولی، می‌توان این فرآیند را تسهیل کرد. متخصصین معماره برای ارائه راهنمایی‌های مفید به شما آماده هستند.',
      image: '/assets/images/service12.png'
    }
  ]

  return (
    <section className="py-20 bg-gradient-to-b from-white via-gray-50 to-white relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-600 px-4 py-2 rounded-full mb-4">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">۱۲ خدمت تخصصی</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
            خدمات کامل برق‌کاری معماره
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            تمامی خدمات برق‌کاری را با تیم متخصص و با تجربه ارائه می‌دهیم
          </p>
        </div>

        {/* All Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {categories.map((category, index) => {
            const isHovered = hoveredCard === index
            
            return (
              <div
                key={index}
                className="relative bg-white rounded-xl shadow-md hover:shadow-2xl transition-shadow duration-500 overflow-hidden"
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Image Container - Exact aspect ratio for 370x300 */}
                <div className="relative w-full aspect-[370/300] overflow-hidden bg-gray-100">
                  <Image
                    src={category.image}
                    alt={category.title}
                    width={370}
                    height={300}
                    className={`w-full h-full object-cover transition-transform duration-700 ${
                      isHovered ? 'scale-110' : 'scale-100'
                    }`}
                    priority={index < 4}
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  
                  {/* Number Badge - Always visible */}
                  <div className="absolute top-3 right-3 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg z-10">
                    {index + 1}
                  </div>

                  {/* Hover Icon - Conditional rendering */}
                  <div className={`absolute top-3 left-3 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center z-10 transition-all duration-300 ${
                    isHovered ? 'opacity-100 scale-110' : 'opacity-0 scale-90'
                  }`}>
                    <ArrowUpRight className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  {/* Title */}
                  <h3 className={`text-base font-bold mb-3 leading-tight min-h-[3rem] transition-colors duration-300 ${
                    isHovered ? 'text-blue-600' : 'text-gray-900'
                  }`}>
                    <span className="line-clamp-2">{category.title}</span>
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-sm leading-relaxed mb-4 min-h-[4.5rem]">
                    <span className={isHovered ? 'line-clamp-none' : 'line-clamp-3'}>
                      {category.description}
                    </span>
                  </p>

                  {/* CTA Link */}
                  <Link
                    href="/booking"
                    className={`inline-flex items-center text-blue-600 font-medium text-sm transition-all duration-300 ${
                      isHovered ? 'gap-3' : 'gap-2'
                    }`}
                  >
                    <span>درخواست خدمات</span>
                    <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${
                      isHovered ? 'translate-x-1' : 'translate-x-0'
                    }`} />
                  </Link>
                </div>

                {/* Decorative Border - Conditional rendering */}
                <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600 transition-transform duration-500 origin-left ${
                  isHovered ? 'scale-x-100' : 'scale-x-0'
                }`} />
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold px-8 py-4 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
            >
              <Zap className="w-5 h-5" />
              <span>درخواست خدمات برق‌کاری</span>
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center gap-2 bg-white border-2 border-gray-200 text-gray-700 font-bold px-8 py-4 rounded-xl hover:border-blue-600 hover:text-blue-600 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              <span>اطلاعات بیشتر</span>
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </div>
          
          {/* Trust Badge */}
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-500">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-bold">
                  {i}K+
                </div>
              ))}
            </div>
            <span>بیش از ۱۰،۰۰۰ مشتری راضی</span>
          </div>
        </div>
      </div>
    </section>
  )
}
