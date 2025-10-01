'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react'

export function ServiceCategories() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovering, setIsHovering] = useState<number | null>(null)

  const categories = [
    {
      title: 'رفع اتصالی و عیب یابی برق ساختمان',
      description: 'قبل از هر اقدامی، برق ساختمان را قطع کنید تا از خطر برق‌گرفتگی جلوگیری شود. فیوزها، کلیدها، پریزها، سیم‌ها و اتصالات و دستگاه‌های برقی را بررسی کنید. اگر سوختگی یا آسیب دیدگی مشاهده کردید، باید رفع شوند. اگر مشکل پیچیده‌تر از آن بود که بتوانید به تنهایی حل کنید، بهتر است با یک برقکار حرفه‌ای مشورت کنید. همیشه به یاد داشته باشید که کار با برق خطرناک است. در صورت عدم اطمینان، از متخصصین معماره کمک بگیرید.',
      image: '/assets/images/service1.png'
    },
    {
      title: 'سیم کشی و برقکاری ساختمان',
      description: 'سیم کشی ساختمان در یک تقسیم بندی کلی به دو شیوه روکار و توکار انجام می‌شود که برای انجام دادن هر کدام از آن‌ها باید مراحل خاصی را طی کنید. سیم کشی روکار به نوعی از سیم کشی گفته می‌شود که سیم‌ها از روی گچ دیوار و به صورت آزاد از داخل لوله‌ها و داکت‌ها عبور داده می‌شوند و در صورت بروز هرگونه آسیب و به راحتی می‌توان محل آن را پیدا کرد.',
      image: '/assets/images/service2.png'
    },
    {
      title: 'رفع فوری مشکلات سیم‌کشی تلفن',
      description: 'امروزه تلفن ثابت یکی از ضروری ترین وسایل ارتباطی است که قطع شدن آن می تواند بسیاری از کارهای ما را در دنیای ارتباطات با مشکل مواجه کند. از آنجایی که قطعی تلفن در بیشتر مواقع به اشکال در سیم کشی آن ارتباط دارد، بایدعیب یابی سیم کشی تلفن و علت قطعی بوق آن بررسی گردد. در نهایت هم علل اتصالی سیم های برق و نحوه رفع خرابی آنها را شرح خواهیم داد. پس با ما همراه باشید اگراتصال تلفنی ساختمان‌تان مشکل پیدا کرده؟ کارشناسان معماره آماده‌اند تا در کوتاه‌ترین زمان ممکن، خرابی سیم‌کشی داخلی تلفن شما را برطرف کنند و ارتباطات شما را دوباره برقرار سازند.',
      image: '/assets/images/service3.png'
    },
    {
      title: 'نصب و تعمیر انواع کلید و پریز',
      description: 'نصب کلید و پریز در عین حال که کار مشکلی نیست، باید با دقت انجام شود و تمام نکات ایمنی در حین نصب آن مورد توجه قرار بگیرد. از جمله موارد شایع اتصالی‌ها و خطرات برق‌گرفتگی به عایق نبودن کلید و پریزها در سرویس‌هایی که در معرض آب و شستشو قرار دارند، می‌توان اشاره کرد.',
      image: '/assets/images/service4.png'
    },
    {
      title: 'قطعی و پریدگی فیوز',
      description: 'در بعضی از موارد پریدن فیوز برق باعث ایجاد مشکل نمی‌شود و حتی می‌تواند از ایجاد مشکلات بزرگ‌تر نیز پیشگیری نماید. به هر حال ممکن است دلیل پریدن فیوز برق مربوط به مواردی مانند خرابی فیوز، وجود اتصالی در جریان برق و ... باشد. اما توجه داشته باشید که باید حتماً دلیل ایجاد این مشکل را پیدا کنید و آن را برطرف نمایید تا از مشکلات بزرگتر آتی جلوگیری شود.',
      image: '/assets/images/service5.png'
    },
    {
      title: 'برقکاری صنعتی',
      description: 'در تعریف برق صنعتی اینطور می‌توان گفت که به کنترل و مصرف انرژی الکتریکی در یک کارگاه یا کارخانه صنعتی، گفته می‌شود. همچنین تکنیک‌ها و روش‌هایی که برای نظارت و استفاده از برق در صنعت استفاده می‌شود و در ساختمان‌های مسکونی، تجاری، بیمارستان‌ها و… کاربرد دارد نیز، تعریفی از این حوزه محسوب می‌شود.',
      image: '/assets/images/service6.png'
    },
    {
      title: 'نصب لوستر و هالوژن',
      description: 'اگر برای خانه خودتان لوستر خریدید. آن را به برقکاران ما بسپارید تا با استانداردهای ایمنی، مراحل تست، نصب و تحویل روشنایی به شما داده شود. ما تمامی خدمات برق منزل شما را با در نظر گرفتن نهایت ایمنی در عین سرعت عمل انجام می‌دهیم.',
      image: '/assets/images/service7.png'
    },
    {
      title: 'نصب و تعمیر انواع آیفون های تصویری',
      description: 'با پیشرفت تکنولوژی، افراد زیادی به دنبال نصب و تعمیر آیفون تصویری هستند. برای نصب یا تعمیر آیفون، می‌توانید به صورت ۲۴ ساعته با ما در تماس باشید. ما بهترین برقکاران تهران که همگی در زمینه نصب و تعمیر آیفون صوتی و تصویری مهارت دارند را با یک تماس به محل شما اعزام میکنیم.',
      image: '/assets/images/service8.png'
    },
    {
      title: 'سیم کشی و نصب دزدگیر ساختمان',
      description: 'یکی از بهترین دستاوردهای تکنولوژی در چند سال اخیر سیستم‌های دزدگیر اماکن می‌باشد که باعث از بین رفتن مشکلات و دغدغه‌های بسیاری شده است، وظیفه اصلی سیستم‌های دزدگیر اماکن این است که تمام ورود‌های و خروج‌های غیرمجاز در یک محدوده مشخص را گزارش دهند که ورود غیر مجاز می‌تواند انواع مختلفی داشته باشد که توسط مدیر سیستم امنیتی تعیین می‌گردد.',
      image: '/assets/images/service9.png'
    },        
    {
      title: 'دوربین مدار بسته',
      description: 'اجرای دوربین مداربسته به یکی از تجهیزات بسیار ضروری برای انواع مغازه‌ها و ساختمان‌ها تبدیل شده است که با نصب و راه‌اندازی می‌توانید امنیت زیادی را فراهم کنید. با ما تماس بگیرید تا بهترین تعمیرکاران و پشتیبان‌های دوربین مداربسته را برای نصب و راه‌اندازی برای شما اعزام کنیم. مشاوران آماده هستند تا شما را با انواع مرسوم دوربین و ادوات ذخیره‌سازی داده و چگونگی دسترسی به داده‌ها آشنا کنند تا خرید شما با آگاهی بالا انجام شود.',
      image: '/assets/images/service10.png'
    },
    {
      title: 'کولر های گازی و اسپیلت',
      description: 'در فصل زمستان و بهار خیالتان از بابت نصب و راه اندازی کولر گازی و اسپیلیت راحت باشد. کارشاناسان فنی ما در معماره، از صفر تا 100 نصب و اجرا و در نهایت تست کولر گازی و اسپلیت را با استاندارد جهانی پیاده سازی می‌کنند. با کارشناسان ما تماس بگیرید تا کولر گازی و اسپلیت شما را نصب و راه اندازی نماییم.',
      image: '/assets/images/service11.png'
    },
    {
      title: 'نصب و راه‌اندازی خانه‌ی هوشمند',
      description: 'در دنیای امروز، خانه‌های هوشمند به سرعت در حال گسترش هستند و تکنولوژی‌های متنوعی برای بهبود محیط خانگی ارائه میشود. در کنترل روشنایی بر اساس حضور افراد، تنظیم دما، تامین امنیت و غیره می‌تواند به کار گرفته شود. نصب و راه‌اندازی خانه هوشمند می‌تواند چالش‌ برانگیز باشد، اما با روش مناسب و پیروی از مراحل اصولی، می‌توان این فرآیند را تسهیل کرد. متخصصین معماره برای بررسی اصولی نصب خانه هوشمند و ارائه راهنمایی‌های مفید به شما آماده هستند.',
      image: '/assets/images/service12.png'
    }
  ]

  const itemsPerPage = 3
  const totalPages = Math.ceil(categories.length / itemsPerPage)

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % totalPages)
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + totalPages) % totalPages)
  }

  const visibleCategories = categories.slice(
    currentIndex * itemsPerPage,
    (currentIndex + 1) * itemsPerPage
  )

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-600 px-4 py-2 rounded-full mb-4">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">خدمات تخصصی</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
            خدمات برق‌کاری معماره
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            ارائه کامل‌ترین خدمات برق‌کاری با تیم متخصص و با تجربه
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {visibleCategories.map((category, index) => (
            <div
              key={currentIndex * itemsPerPage + index}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden"
              onMouseEnter={() => setIsHovering(currentIndex * itemsPerPage + index)}
              onMouseLeave={() => setIsHovering(null)}
            >
              {/* Image Container */}
              <div className="relative h-64 overflow-hidden">
                <Image
                  src={category.image}
                  alt={category.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                
                {/* Title on Image */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                    {category.title}
                  </h3>
                </div>

                {/* Hover Icon */}
                <div className="absolute top-4 right-4 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className={`text-gray-600 text-sm leading-relaxed transition-all duration-300 ${
                  isHovering === currentIndex * itemsPerPage + index ? 'line-clamp-none' : 'line-clamp-3'
                }`}>
                  {category.description}
                </p>

                {/* CTA Button */}
                <Link
                  href="/booking"
                  className="mt-4 inline-flex items-center gap-2 text-blue-600 font-medium hover:gap-3 transition-all group"
                >
                  <span>درخواست خدمات</span>
                  <ChevronLeft className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Decorative Corner */}
              <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-br-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={prevSlide}
            className="p-3 bg-white rounded-full shadow-lg hover:shadow-xl hover:bg-blue-600 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={currentIndex === 0}
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Dots */}
          <div className="flex gap-2">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'w-8 bg-blue-600' : 'w-2 bg-gray-300'
                }`}
                aria-label={`صفحه ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={nextSlide}
            className="p-3 bg-white rounded-full shadow-lg hover:shadow-xl hover:bg-blue-600 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={currentIndex === totalPages - 1}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        {/* View All Link */}
        <div className="text-center mt-12">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold px-8 py-4 rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <span>مشاهده تمام خدمات</span>
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
