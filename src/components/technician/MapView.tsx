'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  MapPin, 
  Navigation, 
  Clock,
  Phone,
  User,
  AlertCircle
} from 'lucide-react'

interface MapViewProps {
  technicianId?: string
}

export function MapView({ technicianId }: MapViewProps) {
  const [jobs, setJobs] = useState<any[]>([])
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (technicianId) {
      loadTodayJobs()
    }
  }, [technicianId])

  const loadTodayJobs = async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const { data } = await supabase
      .from('service_requests')
      .select(`
        *,
        customer:profiles!customer_id(full_name, phone),
        service:services(name_fa)
      `)
      .eq('technician_id', technicianId)
      .gte('scheduled_datetime', today.toISOString())
      .lt('scheduled_datetime', tomorrow.toISOString())
      .order('scheduled_datetime', { ascending: true })

    if (data) {
      setJobs(data)
      if (data.length > 0) {
        setSelectedJob(data[0])
      }
    }
    setLoading(false)
  }

  const openInMaps = (address: string) => {
    // Open in Google Maps or default maps app
    const encodedAddress = encodeURIComponent(address)
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank')
  }

  const getTimeUntilJob = (scheduledTime: string) => {
    const now = new Date()
    const jobTime = new Date(scheduledTime)
    const diff = jobTime.getTime() - now.getTime()
    
    if (diff < 0) return 'گذشته'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours} ساعت و ${minutes} دقیقه`
    }
    return `${minutes} دقیقه`
  }

  if (loading) {
    return (
      <div className="h-96 bg-gray-200 animate-pulse rounded-lg"></div>
    )
  }

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Jobs List */}
      <div className="lg:col-span-1 space-y-3">
        <h3 className="font-bold mb-3">کارهای امروز</h3>
        
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>کاری برای امروز وجود ندارد</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {jobs.map((job, index) => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                  selectedJob?.id === job.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    job.priority === 'emergency' ? 'bg-red-500' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {job.service?.name_fa || job.title}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {job.customer?.full_name}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(job.scheduled_datetime).toLocaleTimeString('fa-IR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {job.status === 'assigned' && (
                        <>
                          <span>•</span>
                          <span>{getTimeUntilJob(job.scheduled_datetime)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {job.priority === 'emergency' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map Area */}
      <div className="lg:col-span-2">
        <div className="bg-gray-100 rounded-lg h-[400px] flex items-center justify-center relative">
          {/* Map Placeholder */}
          <div className="text-center">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">نقشه در حال بارگذاری...</p>
            <p className="text-sm text-gray-400 mt-2">
              برای نمایش نقشه، API گوگل مپ نیاز است
            </p>
          </div>
          
          {/* Selected Job Details */}
          {selectedJob && (
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-lg shadow-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h4 className="font-bold">
                    {selectedJob.service?.name_fa || selectedJob.title}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedJob.address}
                  </p>
                </div>
                
                <button
                  onClick={() => openInMaps(selectedJob.address)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  مسیریابی
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{selectedJob.customer?.full_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a href={`tel:${selectedJob.customer?.phone}`} className="text-blue-600">
                    {selectedJob.customer?.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>
                    {new Date(selectedJob.scheduled_datetime).toLocaleTimeString('fa-IR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{selectedJob.city}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}