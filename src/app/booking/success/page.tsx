'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Loader2, Home, Phone, Mail } from 'lucide-react'
import type { ServiceRequest, Service } from '@/types/database'

export default function BookingSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const requestId = searchParams.get('id')
  const [loading, setLoading] = useState(true)
  const [request, setRequest] = useState<ServiceRequest | null>(null)
  const [service, setService] = useState<Service | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!requestId) {
      router.push('/booking')
      return
    }

    async function fetchRequestDetails() {
      try {
        const { data: requestData, error: requestError } = await supabase
          .from('service_requests')
          .select('*')
          .eq('id', requestId)
          .single()

        if (requestError) throw requestError

        setRequest(requestData)

        if (requestData.service_id) {
          const { data: serviceData } = await supabase
            .from('services')
            .select('*')
            .eq('id', requestData.service_id)
            .single()

          setService(serviceData)
        }
      } catch (error) {
        console.error('Error fetching request:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRequestDetails()
  }, [requestId, router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">در حال بارگذاری...</p>
        </div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <p className="text-red-600 mb-4">درخواست یافت نشد</p>
          <button
            onClick={() => router.push('/booking')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            بازگشت به صفحه رزرو
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Success Message */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                درخواست شما با موفقیت ثبت شد!
              </h1>
              <p className="text-gray-600">
                شماره پیگیری: <span className="font-bold">{request.request_number}</span>
              </p>
            </div>

            {/* Request Details */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h2 className="font-bold text-lg mb-4">جزئیات درخواست</h2>
              
              <div className="grid gap-4">
                <div>
                  <p className="text-sm text-gray-500">خدمات</p>
                  <p className="font-medium">{service?.name_fa || request.title}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">آدرس</p>
                  <p className="font-medium">{request.address}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">تاریخ</p>
                    <p className="font-medium">
                      {new Date(request.requested_date).toLocaleDateString('fa-IR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">زمان</p>
                    <p className="font-medium">{request.requested_time_slot}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500">وضعیت</p>
                  <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                    در انتظار تایید
                  </span>
                </div>

                {request.is_emergency && (
                  <div>
                    <span className="inline-block px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                      درخواست اضطراری
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Next Steps */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-bold mb-3">مراحل بعدی</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-600 ml-2">۱.</span>
                  <span>کارشناس ما در اسرع وقت با شما تماس خواهد گرفت</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 ml-2">۲.</span>
                  <span>زمان دقیق حضور تکنسین هماهنگ خواهد شد</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 ml-2">۳.</span>
                  <span>می‌توانید وضعیت درخواست را در پنل کاربری پیگیری کنید</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push('/')}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <Home className="w-5 h-5 ml-2" />
                بازگشت به صفحه اصلی
              </button>
              <button
                onClick={() => router.push('/dashboard/requests')}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                مشاهده درخواست‌ها
              </button>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="font-bold mb-4">اطلاعات تماس</h3>
            <div className="space-y-3">
              <a 
                href="tel:02112345678"
                className="flex items-center text-gray-700 hover:text-blue-600"
              >
                <Phone className="w-5 h-5 ml-3 text-gray-400" />
                <span>۰۲۱-۱۲۳۴۵۶۷۸</span>
              </a>
              <a 
                href="mailto:support@memareh.com"
                className="flex items-center text-gray-700 hover:text-blue-600"
              >
                <Mail className="w-5 h-5 ml-3 text-gray-400" />
                <span>support@memareh.com</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
