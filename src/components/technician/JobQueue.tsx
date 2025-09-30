'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  MapPin, 
  Phone, 
  Clock,
  CheckCircle,
  PlayCircle,
  Navigation,
  AlertCircle,
  User,
  Calendar
} from 'lucide-react'

interface JobQueueProps {
  technicianId?: string
}

export function JobQueue({ technicianId }: JobQueueProps) {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'today' | 'urgent'>('today')
  const supabase = createClient()

  useEffect(() => {
    if (technicianId) {
      loadJobs()
    }
  }, [technicianId, filter])

  const loadJobs = async () => {
    let query = supabase
      .from('service_requests')
      .select(`
        *,
        customer:profiles!customer_id(full_name, phone, address),
        service:services(name_fa, estimated_duration)
      `)
      .eq('technician_id', technicianId)
      .in('status', ['assigned', 'in_progress'])
      .order('priority', { ascending: false })
      .order('scheduled_datetime', { ascending: true })

    if (filter === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      query = query
        .gte('scheduled_datetime', today.toISOString())
        .lt('scheduled_datetime', tomorrow.toISOString())
    } else if (filter === 'urgent') {
      query = query.eq('priority', 'emergency')
    }

    const { data, error } = await query
    
    if (data && !error) {
      setJobs(data)
    }
    setLoading(false)
  }

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    const updates: any = { 
      status: newStatus,
      updated_at: new Date().toISOString()
    }
    
    if (newStatus === 'in_progress') {
      updates.started_at = new Date().toISOString()
    } else if (newStatus === 'completed') {
      updates.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('service_requests')
      .update(updates)
      .eq('id', jobId)

    if (!error) {
      loadJobs()
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'bg-red-100 text-red-700 border-red-300'
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'normal': return 'bg-blue-100 text-blue-700 border-blue-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assigned': return 'تعیین شده'
      case 'in_progress': return 'در حال انجام'
      default: return status
    }
  }

  const formatTime = (datetime: string) => {
    const date = new Date(datetime)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-200 animate-pulse h-32 rounded-lg"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          همه کارها
        </button>
        <button
          onClick={() => setFilter('today')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'today' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          امروز
        </button>
        <button
          onClick={() => setFilter('urgent')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'urgent' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          اضطراری
        </button>
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>کار جدیدی برای نمایش وجود ندارد</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className={`bg-white border-2 rounded-lg p-4 ${
                job.priority === 'emergency' ? 'border-red-300' : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(job.priority)}`}>
                      {job.priority === 'emergency' ? 'اضطراری' : job.priority === 'high' ? 'فوری' : 'عادی'}
                    </span>
                    <span className="text-sm text-gray-500">
                      #{job.request_number}
                    </span>
                    <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {getStatusLabel(job.status)}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-lg mb-2">
                    {job.service?.name_fa || job.title}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{job.customer?.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${job.customer?.phone}`} className="text-blue-600">
                        {job.customer?.phone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{job.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(job.scheduled_datetime).toLocaleDateString('fa-IR')}
                      </span>
                      <Clock className="w-4 h-4 mr-2" />
                      <span>{formatTime(job.scheduled_datetime)}</span>
                    </div>
                  </div>

                  {job.description && (
                    <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                      <p className="font-medium mb-1">توضیحات:</p>
                      <p>{job.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4 pt-4 border-t">
                {job.status === 'assigned' && (
                  <>
                    <button
                      onClick={() => updateJobStatus(job.id, 'in_progress')}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <PlayCircle className="w-5 h-5" />
                      شروع کار
                    </button>
                    <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                      <Navigation className="w-5 h-5" />
                      مسیریابی
                    </button>
                  </>
                )}
                
                {job.status === 'in_progress' && (
                  <button
                    onClick={() => updateJobStatus(job.id, 'completed')}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    اتمام کار
                  </button>
                )}
                
                <button className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}