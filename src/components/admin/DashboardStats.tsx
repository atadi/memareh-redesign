'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Users, 
  FileText, 
  TrendingUp, 
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity
} from 'lucide-react'

export function DashboardStats() {
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    completedToday: 0,
    monthlyRevenue: 0,
    activeTechnicians: 0,
    emergencyQueue: 0,
    averageRating: 0,
    monthlyGrowth: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    // تعداد کل درخواست‌ها
    const { count: totalRequests } = await supabase
      .from('service_requests')
      .select('*', { count: 'exact', head: true })

    // درخواست‌های در انتظار
    const { count: pendingRequests } = await supabase
      .from('service_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // تکمیل شده امروز
    const today = new Date().toISOString().split('T')[0]
    const { count: completedToday } = await supabase
      .from('service_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', today)

    // تکنسین‌های فعال
    const { count: activeTechnicians } = await supabase
      .from('technicians')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available')

    // صف اضطراری
    const { count: emergencyQueue } = await supabase
      .from('emergency_queue')
      .select('*', { count: 'exact', head: true })
      .is('assigned_at', null)

    setStats({
      totalRequests: totalRequests || 0,
      pendingRequests: pendingRequests || 0,
      completedToday: completedToday || 0,
      monthlyRevenue: 15750000, // محاسبه از دیتابیس
      activeTechnicians: activeTechnicians || 0,
      emergencyQueue: emergencyQueue || 0,
      averageRating: 4.5,
      monthlyGrowth: 12.5
    })
    
    setLoading(false)
  }

  const statCards = [
    {
      title: 'درخواست‌های امروز',
      value: stats.totalRequests,
      icon: FileText,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      change: '+12%'
    },
    {
      title: 'در انتظار پاسخ',
      value: stats.pendingRequests,
      icon: Clock,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'تکمیل شده امروز',
      value: stats.completedToday,
      icon: CheckCircle,
      color: 'bg-green-500',
      bgColor: 'bg-green-50'
    },
    {
      title: 'درآمد این ماه',
      value: `${(stats.monthlyRevenue / 1000000).toFixed(1)}M`,
      icon: DollarSign,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      change: '+8%'
    },
    {
      title: 'تکنسین‌های فعال',
      value: stats.activeTechnicians,
      icon: Users,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'صف اضطراری',
      value: stats.emergencyQueue,
      icon: AlertCircle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50'
    }
  ]

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">نمای کلی داشبورد</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
                {stat.change && (
                  <span className="text-sm text-green-600 font-medium">
                    {stat.change}
                  </span>
                )}
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            فعالیت‌های اخیر
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">درخواست جدید - محسن رضایی</span>
              <span className="text-xs text-gray-500">۵ دقیقه پیش</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm">کار تکمیل شد - علی احمدی</span>
              <span className="text-xs text-gray-500">۱۵ دقیقه پیش</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm">درخواست اضطراری - زهرا کریمی</span>
              <span className="text-xs text-gray-500">۳۰ دقیقه پیش</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            عملکرد این هفته
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">تعداد درخواست‌ها</span>
              <span className="font-bold">۱۲۴</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">میانگین زمان پاسخ</span>
              <span className="font-bold">۴۵ دقیقه</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">رضایت مشتری</span>
              <span className="font-bold">۹۲%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}