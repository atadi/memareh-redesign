'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  Filter
} from 'lucide-react'

export function RevenueAnalytics() {
  const [period, setPeriod] = useState('month')
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    averageTransaction: 0,
    growth: 0,
    topServices: [],
    monthlyData: []
  })
  const supabase = createClient()

  useEffect(() => {
    loadAnalytics()
  }, [period])

  const loadAnalytics = async () => {
    // Load revenue data based on period
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('status', 'paid')
      .gte('paid_date', getStartDate(period))

    if (invoices) {
      const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
      const totalTransactions = invoices.length
      const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

      setStats({
        totalRevenue,
        totalTransactions,
        averageTransaction,
        growth: 12.5, // محاسبه رشد واقعی
        topServices: [], // بارگذاری از دیتابیس
        monthlyData: [] // داده‌های ماهانه
      })
    }
  }

  const getStartDate = (period: string) => {
    const now = new Date()
    switch (period) {
      case 'week':
        now.setDate(now.getDate() - 7)
        break
      case 'month':
        now.setMonth(now.getMonth() - 1)
        break
      case 'quarter':
        now.setMonth(now.getMonth() - 3)
        break
      case 'year':
        now.setFullYear(now.getFullYear() - 1)
        break
    }
    return now.toISOString()
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">تحلیل درآمد</h2>
          
          <div className="flex gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="week">هفته گذشته</option>
              <option value="month">ماه گذشته</option>
              <option value="quarter">سه ماه گذشته</option>
              <option value="year">سال گذشته</option>
            </select>
            
            <button className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2">
              <Download className="w-4 h-4" />
              دانلود گزارش
            </button>
          </div>
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 opacity-50" />
              <span className="text-sm flex items-center gap-1">
                {stats.growth > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    {stats.growth}%
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    {Math.abs(stats.growth)}%
                  </>
                )}
              </span>
            </div>
            <p className="text-sm opacity-90">کل درآمد</p>
            <p className="text-2xl font-bold">
              {(stats.totalRevenue / 1000000).toFixed(1)}M تومان
            </p>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">تعداد تراکنش</p>
            <p className="text-2xl font-bold">{stats.totalTransactions}</p>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">میانگین تراکنش</p>
            <p className="text-2xl font-bold">
              {(stats.averageTransaction / 1000).toFixed(0)}k
            </p>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">نرخ رشد</p>
            <p className="text-2xl font-bold text-green-600">+{stats.growth}%</p>
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">نمودار درآمد ماهانه</p>
          {/* Add recharts or chart.js here */}
        </div>
      </div>

      {/* Top Services */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4">پردرآمدترین خدمات</h3>
        <div className="space-y-3">
          {['سیم‌کشی ساختمان', 'نصب کولر', 'تعمیرات اضطراری', 'بازرسی برق'].map((service, index) => (
            <div key={index} className="flex items-center justify-between">
              <span>{service}</span>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${80 - index * 15}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-20 text-left">
                  {(12.5 - index * 2).toFixed(1)}M
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}