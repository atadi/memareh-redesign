'use client'

import { 
  MapPin, 
  Home, 
  Building2, 
  Store,
  Warehouse,
  Building
} from 'lucide-react'

interface LocationFormProps {
  register: any
  errors: any
  setValue: any
}

export function LocationForm({ register, errors, setValue }: LocationFormProps) {
  
  const propertyTypes = [
    { value: 'apartment', label: 'آپارتمان', icon: Building2 },
    { value: 'house', label: 'خانه ویلایی', icon: Home },
    { value: 'office', label: 'دفتر کار', icon: Building },
    { value: 'shop', label: 'مغازه', icon: Store },
    { value: 'warehouse', label: 'انبار', icon: Warehouse },
  ]

  const cities = [
    'تهران',
    'کرج', 
    'اصفهان',
    'شیراز',
    'مشهد',
    'تبریز',
    'اهواز',
    'قم',
    'کرمانشاه',
    'ارومیه'
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">آدرس محل خدمات</h2>
        <p className="text-gray-600">
          لطفا آدرس دقیق محل مورد نظر را وارد کنید
        </p>
      </div>

      {/* Property Type Selection */}
      <div>
        <label className="block text-sm font-medium mb-3">
          نوع ملک
        </label>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {propertyTypes.map(type => {
            const Icon = type.icon
            return (
              <label
                key={type.value}
                className="relative cursor-pointer"
              >
                <input
                  type="radio"
                  value={type.value}
                  {...register('propertyType')}
                  className="sr-only peer"
                />
                <div className="
                  border-2 rounded-lg p-3 text-center transition-all
                  peer-checked:border-blue-500 peer-checked:bg-blue-50
                  hover:border-gray-300 hover:shadow-md
                ">
                  <Icon className="w-6 h-6 mx-auto mb-1 text-gray-600 peer-checked:text-blue-600" />
                  <span className="text-sm">{type.label}</span>
                </div>
              </label>
            )
          })}
        </div>
        {errors.propertyType && (
          <p className="text-red-500 text-sm mt-1">{errors.propertyType.message}</p>
        )}
      </div>

      {/* City Selection */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            شهر
          </label>
          <select
            {...register('city')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">انتخاب شهر...</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          {errors.city && (
            <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            منطقه
          </label>
          <input
            type="text"
            {...register('district')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="مثال: ونک، ولیعصر، ..."
          />
        </div>
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium mb-2">
          آدرس کامل
        </label>
        <textarea
          {...register('address')}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="خیابان اصلی، کوچه، پلاک، واحد..."
        />
        {errors.address && (
          <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
        )}
      </div>

      {/* Additional Details */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            کد پستی (اختیاری)
          </label>
          <input
            type="text"
            {...register('postalCode')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="۱۲۳۴۵۶۷۸۹۰"
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            طبقه / واحد
          </label>
          <input
            type="text"
            {...register('unit')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="طبقه ۳، واحد ۱۲"
          />
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">
          نقشه تعاملی برای انتخاب موقعیت
        </p>
        <p className="text-sm text-gray-400 mt-1">
          (در نسخه بعدی اضافه خواهد شد)
        </p>
      </div>

      {/* Contact Info */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>توجه:</strong> آدرس دقیق شما فقط پس از تایید درخواست در اختیار تکنسین قرار خواهد گرفت.
        </p>
      </div>
    </div>
  )
}