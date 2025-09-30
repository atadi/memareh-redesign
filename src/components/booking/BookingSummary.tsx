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

interface BookingSummaryProps {
  formData: any
  selectedService: any
}

export function BookingSummary({ formData, selectedService }: BookingSummaryProps) {
  
  const calculateTotal = () => {
    let basePrice = selectedService?.price || 0
    
    // Emergency surcharge
    if (formData.isEmergency) {
      basePrice = basePrice * 1.5 + 50000
    }
    
    // Tax (9%)
    const tax = basePrice * 0.09
    
    return {
      basePrice: selectedService?.price || 0,
      emergencyFee: formData.isEmergency ? (selectedService?.price * 0.5 + 50000) : 0,
      tax,
      total: basePrice + tax
    }
  }

  const pricing = calculateTotal()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">تایید و پرداخت</h2>
        <p className="text-gray-600">
          لطفا اطلاعات زیر را بررسی و تایید کنید
        </p>
      </div>

      {/* Service Summary */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          خدمات انتخابی
        </h3>
        <div className="space-y-2 text-sm">
          <p className="font-medium">{selectedService?.name}</p>
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
          <p>{formData.city} - {formData.district}</p>
          <p className="text-gray-600">{formData.address}</p>
          {formData.unit && <p className="text-gray-500">{formData.unit}</p>}
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
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-bold mb-3">صورتحساب</h3>
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
          
          <div className="pt-2 border-t border-gray-300">
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
          <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input type="radio" name="payment" value="online" defaultChecked />
            <CreditCard className="w-5 h-5 text-gray-600" />
            <div>
              <p className="font-medium">پرداخت آنلاین</p>
              <p className="text-sm text-gray-500">پرداخت امن با درگاه بانکی</p>
            </div>
          </label>
          
          <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input type="radio" name="payment" value="cash" />
            <DollarSign className="w-5 h-5 text-gray-600" />
            <div>
              <p className="font-medium">پرداخت نقدی</p>
              <p className="text-sm text-gray-500">پرداخت پس از اتمام کار</p>
            </div>
          </label>
        </div>
      </div>

      {/* Terms */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" required className="mt-1" />
          <span className="text-sm text-gray-700">
            شرایط و قوانین استفاده از خدمات را مطالعه کرده و می‌پذیرم.
            هزینه رفت و آمد تکنسین ۵۰،۰۰۰ تومان می‌باشد که در صورت انصراف از خدمات، این مبلغ دریافت خواهد شد.
          </span>
        </label>
      </div>
    </div>
  )
}