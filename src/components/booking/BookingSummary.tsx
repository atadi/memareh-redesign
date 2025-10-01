'use client'

import { 
  CheckCircle,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  User,
  Phone,
  AlertCircle,
  CreditCard
} from 'lucide-react'
import Image from 'next/image'

interface BookingSummaryProps {
  formData: any
  selectedService: any
}

export function BookingSummary({ formData, selectedService }: BookingSummaryProps) {
  
  const calculateTotal = () => {
    let basePrice = selectedService?.base_price || 0
    
    // Emergency surcharge
    if (formData.isEmergency) {
      basePrice = basePrice * 1.5 + 50000
    }
    
    // Tax (9%)
    const tax = basePrice * 0.09
    
    return {
      basePrice: selectedService?.base_price || 0,
      emergencyFee: formData.isEmergency ? (selectedService?.base_price * 0.5 + 50000) : 0,
      tax,
      total: basePrice + tax
    }
  }

  const pricing = calculateTotal()

  return (
    <div className="space-y-6">
      {/* Header with Logo */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">تایید و پرداخت</h2>
          <p className="text-gray-600">
            لطفا اطلاعات زیر را بررسی و تایید کنید
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Image
            src="/assets/logo/fav-logo.png"
            alt="معماره"
            width={40}
            height={40}
            className="opacity-30"
          />
        </div>
      </div>

      {/* Service Summary */}
      <div className="bg-white border rounded-lg p-4 relative overflow-hidden">
        {/* Watermark */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
          <Image
            src="/assets/logo/logo.png"
            alt="معماره"
            width={200}
            height={200}
          />
        </div>
        
        <h3 className="font-bold mb-3 flex items-center gap-2 relative z-10">
          <CheckCircle className="w-5 h-5 text-green-500" />
          خدمات انتخابی
        </h3>
        <div className="space-y-2 text-sm relative z-10">
          <p className="font-medium">{selectedService?.name_fa}</p>
          <p className="text-gray-600">{selectedService?.description}</p>
          {formData.description && (
            <div className="bg-gray-50 p-3 rounded">
              <p className="text-gray-700">{formData.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Location Summary */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-500" />
          آدرس
        </h3>
        <div className="space-y-1 text-sm">
          <p>{formData.city}</p>
          <p className="text-gray-600">{formData.address}</p>
          {formData.locationDetails && <p className="text-gray-500">{formData.locationDetails}</p>}
        </div>
      </div>

      {/* DateTime Summary */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-500" />
          زمان مراجعه
        </h3>
        <div className="text-sm">
          {formData.isEmergency ? (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">درخواست اضطراری - در اسرع وقت</span>
            </div>
          ) : (
            <p>
              {formData.date && new Date(formData.date).toLocaleDateString('fa-IR')} - {formData.timeSlot}
            </p>
          )}
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-600" />
          صورتحساب
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>هزینه خدمات:</span>
            <span>{pricing.basePrice.toLocaleString()} تومان</span>
          </div>
          
          {formData.isEmergency && (
            <div className="flex justify-between text-red-600">
              <span>هزینه اضطراری:</span>
              <span>{pricing.emergencyFee.toLocaleString()} تومان</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span>مالیات (۹٪):</span>
            <span>{Math.round(pricing.tax).toLocaleString()} تومان</span>
          </div>
          
          <div className="pt-2 border-t border-blue-200">
            <div className="flex justify-between font-bold text-lg">
              <span>جمع کل:</span>
              <span className="text-blue-600">
                {Math.round(pricing.total).toLocaleString()} تومان
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div>
        <h3 className="font-bold mb-3">روش پرداخت</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-all">
            <input type="radio" name="payment" value="online" defaultChecked className="text-blue-600" />
            <CreditCard className="w-5 h-5 text-gray-600" />
            <div className="flex-1">
              <p className="font-medium">پرداخت آنلاین</p>
              <p className="text-sm text-gray-500">پرداخت امن با درگاه بانکی</p>
            </div>
            <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">توصیه می‌شود</div>
          </label>
          
          <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-all">
            <input type="radio" name="payment" value="cash" className="text-blue-600" />
            <DollarSign className="w-5 h-5 text-gray-600" />
            <div>
              <p className="font-medium">پرداخت نقدی</p>
              <p className="text-sm text-gray-500">پرداخت پس از اتمام کار</p>
            </div>
          </label>
        </div>
      </div>

      {/* Terms */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" required className="mt-1 text-blue-600" />
          <div className="flex-1">
            <span className="text-sm text-gray-700">
              شرایط و قوانین استفاده از خدمات را مطالعه کرده و می‌پذیرم.
              هزینه رفت و آمد تکنسین ۵۰،۰۰۰ تومان می‌باشد که در صورت انصراف از خدمات، این مبلغ دریافت خواهد شد.
            </span>
          </div>
        </label>
      </div>

      {/* Trust Badge */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
        <Image
          src="/assets/logo/fav-logo.png"
          alt="معماره"
          width={24}
          height={24}
        />
        <span>پرداخت امن با</span>
        <span className="font-bold text-blue-600">معماره</span>
      </div>
    </div>
  )
}
