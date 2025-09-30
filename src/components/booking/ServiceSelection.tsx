'use client'

import { useState } from 'react'
import { 
  Zap, 
  Wrench, 
  Home, 
  Building, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign
} from 'lucide-react'

interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: number
  icon: any
  category: string
  isEmergency: boolean
}

interface ServiceSelectionProps {
  selectedService: Service | null
  onSelectService: (service: Service) => void
  register: any
  errors: any
}

export function ServiceSelection({ 
  selectedService, 
  onSelectService, 
  register, 
  errors 
}: ServiceSelectionProps) {
  
  const services: Service[] = [
    {
      id: '1',
      name: 'رفع قطعی برق',
      description: 'رفع مشکلات قطعی برق و اتصالی',
      price: 250000,
      duration: 60,
      icon: AlertTriangle,
      category: 'emergency',
      isEmergency: true
    },
    {
      id: '2',
      name: 'نصب کولر گازی',
      description: 'نصب و راه‌اندازی انواع کولر گازی اسپلیت',
      price: 500000,
      duration: 120,
      icon: Home,
      category: 'installation',
      isEmergency: false
    },
    {
      id: '3',
      name: 'سیم‌کشی ساختمان',
      description: 'سیم‌کشی کامل واحد مسکونی یا تجاری',
      price: 0,
      duration: 480,
      icon: Building,
      category: 'wiring',
      isEmergency: false
    },
    {
      id: '4',
      name: 'تعمیر کلید و پریز',
      description: 'تعمیر یا تعویض کلید و پریز معیوب',
      price: 150000,
      duration: 30,
      icon: Wrench,
      category: 'repair',
      isEmergency: false
    },
    {
      id: '5',
      name: 'نصب چراغ و لوستر',
      description: 'نصب انواع چراغ، لوستر و روشنایی',
      price: 100000,
      duration: 45,
      icon: Zap,
      category: 'installation',
      isEmergency: false
    },
    {
      id: '6',
      name: 'بازرسی سیستم برق',
      description: 'بازرسی کامل و ارائه گزارش فنی',
      price: 300000,
      duration: 90,
      icon: CheckCircle,
      category: 'inspection',
      isEmergency: false
    }
  ]

  const formatPrice = (price: number) => {
    if (price === 0) return 'توافقی'
    return `${(price / 1000).toLocaleString()} هزار تومان`
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">انتخاب نوع خدمات</h2>
        <p className="text-gray-600">
          لطفا نوع خدمات مورد نیاز خود را انتخاب کنید
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {services.map(service => {
          const Icon = service.icon
          const isSelected = selectedService?.id === service.id
          
          return (
            <div
              key={service.id}
              onClick={() => onSelectService(service)}
              className={`
                border-2 rounded-lg p-4 cursor-pointer transition-all
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }
                ${service.isEmergency ? 'relative' : ''}
              `}
            >
              {service.isEmergency && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  اضطراری
                </div>
              )}
              
              <div className="flex items-start gap-4">
                <div className={`
                  p-3 rounded-lg
                  ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}
                `}>
                  <Icon className={`
                    w-6 h-6
                    ${isSelected ? 'text-blue-600' : 'text-gray-600'}
                  `} />
                </div>
                
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">
                    {service.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-2">
                    {service.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{service.duration} دقیقه</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <DollarSign className="w-4 h-4" />
                      <span>{formatPrice(service.price)}</span>
                    </div>
                  </div>
                </div>
                
                <div className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center
                  ${isSelected ? 'border-blue-500' : 'border-gray-300'}
                `}>
                  {isSelected && (
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Additional Description Field */}
      <div>
        <label className="block text-sm font-medium mb-2">
          توضیحات تکمیلی
        </label>
        <textarea
          {...register('description')}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="لطفا جزئیات مشکل یا درخواست خود را شرح دهید..."
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
        )}
      </div>

      <input
        type="hidden"
        {...register('service')}
        value={selectedService?.id || ''}
      />
      {errors.service && (
        <p className="text-red-500 text-sm">{errors.service.message}</p>
      )}
    </div>
  )
}