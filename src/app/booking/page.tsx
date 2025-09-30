'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { ServiceSelection } from '@/components/booking/ServiceSelection'
import { LocationForm } from '@/components/booking/LocationForm'
import { TimeSlotPicker } from '@/components/booking/TimeSlotPicker'
import { BookingSummary } from '@/components/booking/BookingSummary'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Service, ServiceRequest } from '@/types/database'
import toast from 'react-hot-toast'

const bookingSchema = z.object({
  service: z.string().min(1, 'لطفا نوع خدمات را انتخاب کنید'),
  description: z.string().min(10, 'لطفا توضیحات کامل مشکل را وارد کنید'),
  propertyType: z.string().min(1, 'نوع ملک را انتخاب کنید'),
  address: z.string().min(10, 'آدرس کامل را وارد کنید'),
  city: z.string().min(1, 'شهر را انتخاب کنید'),
  postalCode: z.string().optional(),
  locationDetails: z.string().optional(),
  date: z.date(),
  timeSlot: z.string().min(1, 'زمان مراجعه را انتخاب کنید'),
  isEmergency: z.boolean(),
  images: z.array(z.string()).optional(),
})

type BookingFormData = z.infer<typeof bookingSchema>

export default function BookingPage() {
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  
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
      locationDetails: '',
      timeSlot: '',
    }
  })

  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true)
    
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        toast.error('لطفا ابتدا وارد حساب کاربری خود شوید')
        router.push('/login')
        return
      }

      // Generate unique request number
      const requestNumber = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

      // Prepare service request data
      const serviceRequest: ServiceRequest = {
        customer_id: user.id,
        service_id: data.service,
        title: selectedService?.name_fa || 'درخواست خدمات',
        description: data.description,
        property_type: data.propertyType as any,
        address: data.address,
        city: data.city,
        postal_code: data.postalCode || null,
        location_details: data.locationDetails || null,
        requested_date: data.date.toISOString().split('T')[0],
        requested_time_slot: data.timeSlot,
        is_emergency: data.isEmergency,
        status: 'pending',
        priority: data.isEmergency ? 'emergency' : 'normal',
        images: data.images || null,
      }

      // Insert service request
      const { data: insertedRequest, error: insertError } = await supabase
        .from('service_requests')
        .insert(serviceRequest)
        .select()
        .single()

      if (insertError) {
        console.error('Error creating service request:', insertError)
        throw new Error('خطا در ثبت درخواست. لطفا دوباره تلاش کنید.')
      }

      toast.success('درخواست شما با موفقیت ثبت شد!')
      
      // Redirect to success page or dashboard
      router.push(`/booking/success?id=${insertedRequest.id}`)
      
    } catch (error) {
      console.error('Booking submission error:', error)
      toast.error(error instanceof Error ? error.message : 'خطا در ثبت درخواست')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handler for service selection
  const handleServiceSelect = (service: Service) => {
    setSelectedService(service)
    setValue('service', service.id)
    setValue('isEmergency', service.is_emergency || false)
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
        return selectedService !== null && watch('description')?.length >= 10
      case 2:
        return watch('address')?.length >= 10 && watch('city')?.length > 0
      case 3:
        return watch('date') && watch('timeSlot')?.length > 0
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
                onSelectService={handleServiceSelect}
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
                disabled={step === 1 || isSubmitting}
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
                      toast.error('لطفا ابتدا این مرحله را تکمیل کنید')
                    }
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                  disabled={isSubmitting}
                >
                  مرحله بعد
                  <ChevronLeft className="inline w-5 h-5 mr-2" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                      در حال ثبت...
                    </>
                  ) : (
                    'تایید و ثبت درخواست'
                  )}
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
