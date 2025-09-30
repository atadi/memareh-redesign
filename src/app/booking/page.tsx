'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { ServiceSelection } from '@/components/booking/ServiceSelection'
import { LocationForm } from '@/components/booking/LocationForm'
import { TimeSlotPicker } from '@/components/booking/TimeSlotPicker'
import { BookingSummary } from '@/components/booking/BookingSummary'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Define the Service interface to match ServiceSelection
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

const bookingSchema = z.object({
  service: z.string().min(1, 'لطفا نوع خدمات را انتخاب کنید'),
  description: z.string().min(10, 'لطفا توضیحات کامل مشکل را وارد کنید'),
  propertyType: z.string().min(1, 'نوع ملک را انتخاب کنید'),
  address: z.string().min(10, 'آدرس کامل را وارد کنید'),
  city: z.string().min(1, 'شهر را انتخاب کنید'),
  postalCode: z.string().optional(),
  date: z.date(),
  timeSlot: z.string().min(1, 'زمان مراجعه را انتخاب کنید'),
  isEmergency: z.boolean(),
  images: z.array(z.string()).optional(),
})

type BookingFormData = z.infer<typeof bookingSchema>

export default function BookingPage() {
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState<Service | null>(null)  // Fixed: proper type
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      isEmergency: false,
      description: '',
      service: '',
      propertyType: '',
      address: '',
      city: '',
      postalCode: '',
      timeSlot: '',
    }
  })

  const onSubmit = async (data: BookingFormData) => {
    // Submit booking to Supabase
    console.log('Booking data:', data)
    console.log('Selected service:', selectedService)
    
    // Here you would typically:
    // 1. Create the booking in Supabase
    // 2. Send confirmation email/SMS
    // 3. Redirect to confirmation page
  }

  // Handler for service selection
  const handleServiceSelect = (service: Service) => {
    setSelectedService(service)
    setValue('service', service.id)  // Also update the form value
  }

  const steps = [
    { number: 1, title: 'انتخاب خدمات', component: ServiceSelection },
    { number: 2, title: 'آدرس و موقعیت', component: LocationForm },
    { number: 3, title: 'تاریخ و زمان', component: TimeSlotPicker },
    { number: 4, title: 'تایید و پرداخت', component: BookingSummary },
  ]

  const canProceedToNextStep = () => {
    switch(step) {
      case 1:
        return selectedService !== null
      case 2:
        // You can add more validation here
        return true
      case 3:
        return true
      default:
        return true
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Progress Steps */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            {steps.map((s, index) => (
              <div key={s.number} className="flex items-center">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center font-bold transition-colors
                  ${step >= s.number ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}
                `}>
                  {s.number}
                </div>
                <div className="mr-2">
                  <p className={`text-sm ${step >= s.number ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                    {s.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <ChevronLeft className="w-6 h-6 text-gray-400 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit(onSubmit)}>
            {step === 1 && (
              <ServiceSelection
                selectedService={selectedService}
                onSelectService={handleServiceSelect}  // Fixed: using the handler function
                register={register}
                errors={errors}
              />
            )}

            {step === 2 && (
              <LocationForm
                register={register}
                errors={errors}
                setValue={setValue}
              />
            )}

            {step === 3 && (
              <TimeSlotPicker
                register={register}
                errors={errors}
                setValue={setValue}
                watch={watch}
              />
            )}

            {step === 4 && (
              <BookingSummary
                formData={watch()}
                selectedService={selectedService}
              />
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={() => setStep(Math.max(1, step - 1))}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  step === 1 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                disabled={step === 1}
              >
                <ChevronRight className="inline w-5 h-5 ml-2" />
                مرحله قبل
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (canProceedToNextStep()) {
                      setStep(Math.min(4, step + 1))
                    } else {
                      // Show validation message
                      alert('لطفا ابتدا این مرحله را تکمیل کنید')
                    }
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  مرحله بعد
                  <ChevronLeft className="inline w-5 h-5 mr-2" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  تایید و پرداخت
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Help Section */}
        <div className="max-w-4xl mx-auto mt-8 text-center">
          <p className="text-gray-600">
            نیاز به کمک دارید؟
          </p>
          <a 
            href="tel:02112345678" 
            className="text-blue-600 font-bold hover:underline"
          >
            ۰۲۱-۱۲۳۴۵۶۷۸
          </a>
        </div>
      </div>
    </div>
  )
}