'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Star,
  DollarSign,
  AlertCircle
} from 'lucide-react'

interface TechnicianStatsProps {
  technicianId?: string
}

export function TechnicianStats({ technicianId }: TechnicianStatsProps) {
  const [stats, setStats] = useState({
    todayJobs: 0,
    completedToday: 0,
    pendingJobs: 0,
    monthlyEarnings: 0,
    averageRating: 0,
    totalReviews: 0,
    responseTime: 45,
    completionRate: 98
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (technicianId) {
      loadStats()
    }
  }, [technicianId])

  const loadStats = async () => {
    // Load today's jobs
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: todayRequests } = await supabase
      .from('service_requests')
      .select('*')
      .eq('technician_id', technicianId)
      .gte('scheduled_datetime', today.toISOString())
    
    // Load completed today
    const { data: completedToday } = await supabase
      .from('service_requests')
      .select('*')
      .eq('technician_id', technicianId)
      .eq('status', 'completed')
      .gte('completed_at', today.toISOString())
    
    // Load pending jobs
    const { data: pendingJobs } = await supabase
      .from('service_requests')
      .select('*')
      .eq('technician_id', technicianId)
      .in('status', ['assigned', 'in_progress'])
    
    // Load monthly earnings
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const { data: monthlyInvoices } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('technician_id', technicianId)
      .eq('status', 'paid')
      .gte('paid_date', firstDayOfMonth.toISOString())
    
    const monthlyEarnings = monthlyInvoices?.reduce((sum, inv) => sum + inv.total_amount, 0) || 0
    
    // Load ratings
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('technician_id', technicianId)
    
    const averageRating = reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

    setStats({
      todayJobs: todayRequests?.length || 0,
      completedToday: completedToday?.length || 0,
      pendingJobs: pendingJobs?.length || 0,
      monthlyEarnings: monthlyEarnings,
      averageRating: averageRating,
      totalReviews: reviews?.length || 0,
      responseTime: 45,
      completionRate: 98
    })
    
    setLoading(false)
  }

  type StatCard = {
    title: string
    value: string | number
    icon: React.ElementType
    color: string
    bgColor: string
    change?: string | null
    suffix?: string
  }

  const statCards: StatCard[] = [
    {
      title: 'کارهای امروز',
      value: stats.todayJobs,
      icon: Clock,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      change: null,
      suffix: undefined
    },
    {
      title: 'تکمیل شده امروز',
      value: stats.completedToday,
      icon: CheckCircle,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      change: null,
      suffix: undefined
    },
    {
      title: 'در انتظار انجام',
      value: stats.pendingJobs,
      icon: AlertCircle,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      change: null,
      suffix: undefined
    },
    {
      title: 'درآمد این ماه',
      value: `${(stats.monthlyEarnings / 1000000).toFixed(1)}M`,
      icon: DollarSign,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      change: null,
      suffix: 'تومان'
    },
    {
      title: 'امتیاز',
      value: stats.averageRating.toFixed(1),
      icon: Star,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      change: null,
      suffix: `(${stats.totalReviews} نظر)`
    },
    {
      title: 'میانگین زمان پاسخ',
      value: stats.responseTime,
      icon: TrendingUp,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
      change: null,
      suffix: 'دقیقه'
    }
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-200 animate-pulse h-24 rounded-lg"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div key={index} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <Icon className={`w-8 h-8 ${stat.color.replace('bg-', 'text-')}`} />
              {stat.change && (
                <span className="text-xs text-green-600">
                  {stat.change}
                </span>
              )}
            </div>
            <div>
              <p className="text-2xl font-bold">
                {stat.value}
                {stat.suffix && (
                  <span className="text-sm font-normal text-gray-600 mr-1">
                    {stat.suffix}
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-600">{stat.title}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}