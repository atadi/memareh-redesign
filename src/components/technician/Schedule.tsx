'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  MapPin,
  User,
  AlertCircle
} from 'lucide-react'

interface ScheduleProps {
  technicianId?: string
}

export function Schedule({ technicianId }: ScheduleProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedule, setSchedule] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (technicianId) {
      loadSchedule()
    }
  }, [technicianId, currentDate])

  const loadSchedule = async () => {
    const startOfWeek = getStartOfWeek(currentDate)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(endOfWeek.getDate() + 6)
    
    const { data } = await supabase
      .from('service_requests')
      .select(`
        *,
        customer:profiles!customer_id(full_name),
        service:services(name_fa)
      `)
      .eq('technician_id', technicianId)
      .gte('scheduled_datetime', startOfWeek.toISOString())
      .lte('scheduled_datetime', endOfWeek.toISOString())
      .order('scheduled_datetime', { ascending: true })

    if (data) {
      setSchedule(data)
    }
    setLoading(false)
  }

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 0) // Adjust for Saturday start
    return new Date(d.setDate(diff))
  }

  const getWeekDays = () => {
    const days = []
    const startDate = getStartOfWeek(currentDate)
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate)
      day.setDate(startDate.getDate() + i)
      days.push(day)
    }
    
    return days
  }

  const getJobsForDay = (date: Date) => {
    return schedule.filter(job => {
      const jobDate = new Date(job.scheduled_datetime)
      return jobDate.toDateString() === date.toDateString()
    })
  }

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', 
    '13:00', '14:00', '15:00', '16:00', '17:00', 
    '18:00', '19:00', '20:00'
  ]

  const persianWeekDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه']

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + (direction * 7))
    setCurrentDate(newDate)
  }

  if (loading) {
    return (
      <div className="h-96 bg-gray-200 animate-pulse rounded-lg"></div>
    )
  }

  const weekDays = getWeekDays()

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigateWeek(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        
        <div className="text-center">
          <h3 className="font-bold">
            {weekDays[0].toLocaleDateString('fa-IR', { month: 'long', year: 'numeric' })}
          </h3>
        </div>
        
        <button
          onClick={() => navigateWeek(1)}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar View */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="grid grid-cols-8 gap-2 mb-2">
            <div className="text-center text-sm font-medium text-gray-500">ساعت</div>
            {weekDays.map((day, index) => (
              <div key={index} className="text-center">
                <div className="text-sm font-medium text-gray-500">
                  {persianWeekDays[index]}
                </div>
                <div className="text-lg font-bold">
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div className="border rounded-lg overflow-hidden">
            {timeSlots.map((time) => (
              <div key={time} className="grid grid-cols-8 border-b last:border-b-0">
                <div className="p-2 bg-gray-50 text-center text-sm font-medium">
                  {time}
                </div>
                {weekDays.map((day, dayIndex) => {
                  const dayJobs = getJobsForDay(day)
                  const jobAtTime = dayJobs.find(job => {
                    const jobTime = new Date(job.scheduled_datetime)
                    const jobHour = jobTime.getHours().toString().padStart(2, '0') + ':00'
                    return jobHour === time
                  })
                  
                  return (
                    <div
                      key={dayIndex}
                      className={`p-2 border-r ${
                        jobAtTime 
                          ? jobAtTime.priority === 'emergency'
                            ? 'bg-red-50'
                            : 'bg-blue-50'
                          : ''
                      }`}
                    >
                      {jobAtTime && (
                        <div className="text-xs">
                          <p className="font-medium truncate">
                            {jobAtTime.service?.name_fa || jobAtTime.title}
                          </p>
                          <p className="text-gray-600 truncate">
                            {jobAtTime.customer?.full_name}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Schedule Summary */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-bold mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          برنامه امروز
        </h4>
        <div className="space-y-2">
          {getJobsForDay(new Date()).length === 0 ? (
            <p className="text-gray-600">کاری برای امروز برنامه‌ریزی نشده است</p>
          ) : (
            getJobsForDay(new Date()).map(job => (
              <div key={job.id} className="flex items-center justify-between bg-white p-3 rounded">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">
                    {new Date(job.scheduled_datetime).toLocaleTimeString('fa-IR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span>{job.service?.name_fa}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-3 h-3" />
                  <span>{job.city}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}