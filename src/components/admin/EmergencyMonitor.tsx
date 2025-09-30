'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  AlertTriangle,
  Clock,
  MapPin,
  Phone,
  User,
  CheckCircle,
  XCircle,
  Navigation
} from 'lucide-react'

export function EmergencyMonitor() {
  const [emergencies, setEmergencies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadEmergencies()
    
    // Real-time subscription
    const subscription = supabase
      .channel('emergency_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'emergency_queue'
      }, () => {
        loadEmergencies()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadEmergencies = async () => {
    const { data } = await supabase
      .from('service_requests')
      .select(`
        *,
        customer:profiles!customer_id(full_name, phone, address),
        technician:technicians(
          profile:profiles(full_name, phone)
        )
      `)
      .eq('is_emergency', true)
      .in('status', ['pending', 'assigned', 'in_progress'])
      .order('created_at', { ascending: true })

    if (data) {
      setEmergencies(data)
    }
    setLoading(false)
  }

  const assignTechnician = async (requestId: string) => {
    // Logic to assign nearest available technician
    console.log('Assigning technician to:', requestId)
  }

  const getElapsedTime = (createdAt: string) => {
    const elapsed = Date.now() - new Date(createdAt).getTime()
    const minutes = Math.floor(elapsed / 60000)
    
    if (minutes < 60) return `${minutes} دقیقه`
    const hours = Math.floor(minutes / 60)
    return `${hours} ساعت و ${minutes % 60} دقیقه`
  }

  const getPriorityColor = (createdAt: string) => {
    const elapsed = Date.now() - new Date(createdAt).getTime()
    const minutes = Math.floor(elapsed / 60000)
    
    if (minutes > 60) return 'bg-red-500'
    if (minutes > 30) return 'bg-orange-500'
    return 'bg-yellow-500'
  }

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          مانیتور اضطراری
        </h2>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm">
              {emergencies.length} درخواست فعال
            </span>
          </div>
        </div>
      </div>

      {emergencies.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p>هیچ درخواست اضطراری فعالی وجود ندارد</p>
        </div>
      ) : (
        <div className="space-y-4">
          {emergencies.map(emergency => (
            <div
              key={emergency.id}
              className="border rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {/* Priority Badge */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`w-3 h-3 rounded-full animate-pulse ${getPriorityColor(emergency.created_at)}`}></span>
                    <span className="font-bold text-lg">{emergency.title}</span>
                    <span className="text-sm text-gray-500">
                      #{emergency.request_number}
                    </span>
                  </div>

                  {/* Customer Info */}
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-gray-400" />
                      <span>{emergency.customer?.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span dir="ltr">{emergency.customer?.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm col-span-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{emergency.address}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-3">
                    {emergency.description}
                  </p>

                  {/* Status Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-orange-600 font-medium">
                        {getElapsedTime(emergency.created_at)} از زمان درخواست
                      </span>
                    </div>

                    {emergency.technician ? (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>
                          تکنسین: {emergency.technician.profile.full_name}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => assignTechnician(emergency.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                      >
                        <Navigation className="w-4 h-4" />
                        تعیین تکنسین
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}