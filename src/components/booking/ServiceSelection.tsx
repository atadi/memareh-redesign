'use client'

import { 
  Zap, 
  Wrench, 
  Home, 
  Building, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2
} from 'lucide-react'
import type { Service, ServiceWithIcon } from '@/types/database'
import { useServices } from '../../hooks/useServices'

interface ServiceSelectionProps {
  selectedService: Service | null
  onSelectService: (service: Service) => void
  register: any
  errors: any
}

// Map icon names from database to components
const iconMap: Record<string, any> = {
  'alert-triangle': AlertTriangle,
  'zap': Zap,
  'wrench': Wrench,
  'home': Home,
  'building': Building,
  'check-circle': CheckCircle,
}

export function ServiceSelection({ 
  selectedService, 
  onSelectService, 
  register, 
  errors 
}: ServiceSelectionProps) {
  
  const { services, loading, error } = useServices()

  const formatPrice = (price: number | null) => {
    if (!price || price === 0) return 'توافقی'
    return `${(price / 1000).toLocaleString('fa-IR')} هزار تومان`
  }

  const getIcon = (iconName: string | null) => {
    if (!iconName) return Zap
    return iconMap[iconName] || Zap
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="mr-3 text-gray-600">در حال بارگذاری خدمات...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 text-blue-600 hover:underline"
        >
          تلاش مجدد
        </button>
      </div>
    )
  }

  if (services.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">در حال حاضر خدمتی ثبت نشده است.</p>
      </div>
    )
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
          const Icon = getIcon(service.icon)
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
                ${service.is_emergency ? 'relative' : ''}
              `}
            >
              {service.is_emergency && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  اضطراری
                </div>
              )}
              
              {service.popular && !service.is_emergency && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  محبوب
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
                    {service.name_fa}
                  </h3>
                  {service.description && (
                    <p className="text-gray-600 text-sm mb-2">
                      {service.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm">
                    {service.estimated_duration && (
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>{service.estimated_duration} دقیقه</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-gray-500">
                      <DollarSign className="w-4 h-4" />
                      <span>{formatPrice(service.base_price)}</span>
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
