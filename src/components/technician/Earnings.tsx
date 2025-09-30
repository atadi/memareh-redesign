'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  CreditCard,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

interface EarningsOverviewProps {
  technicianId?: string
}

export function EarningsOverview({ technicianId }: EarningsOverviewProps) {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')
  type Transaction = {
    id: string | number
    invoice_number?: string
    status?: string
    total_amount?: number
    issued_date?: string
    request?: {
      service?: {
        name_fa?: string
      }
    }
    // add other fields as needed
  }

  const [earnings, setEarnings] = useState<{
    total: number
    paid: number
    pending: number
    transactions: Transaction[]
  }>({
    total: 0,
    paid: 0,
    pending: 0,
    transactions: []
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (technicianId) {
      loadEarnings()
    }
  }, [technicianId, period])

  const loadEarnings = async () => {
    const startDate = getStartDate(period)
    
    const { data: invoices } = await supabase
      .from('invoices')
      .select(`
        *,
        request:service_requests(
          request_number,
          service:services(name_fa)
        )
      `)
      .eq('technician_id', technicianId)
      .gte('issued_date', startDate.toISOString())
      .order('issued_date', { ascending: false })

    if (invoices) {
      const total = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
      const paid = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
      const pending = total - paid

      setEarnings({
        total,
        paid,
        pending,
        transactions: invoices as any
      })
    }
    
    setLoading(false)
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
      case 'year':
        now.setFullYear(now.getFullYear() - 1)
        break
    }
    return now
  }

  const formatCurrency = (amount: number) => {
    return `${(amount / 1000000).toFixed(2)}M تومان`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'failed': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'پرداخت شده'
      case 'pending': return 'در انتظار'
      case 'failed': return 'ناموفق'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 animate-pulse h-24 rounded-lg"></div>
          ))}
        </div>
        <div className="bg-gray-200 animate-pulse h-64 rounded-lg"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              period === 'week' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            هفته
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              period === 'month' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            ماه
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              period === 'year' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            سال
          </button>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
          <Download className="w-4 h-4" />
          دانلود گزارش
        </button>
      </div>

      {/* Earnings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-6 border-2 border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 text-blue-500" />
            <span className="text-sm text-gray-500">کل درآمد</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(earnings.total)}</p>
          <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
            <ArrowUp className="w-4 h-4" />
            <span>۱۲٪ نسبت به دوره قبل</span>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border-2 border-green-200">
          <div className="flex items-center justify-between mb-4">
            <CreditCard className="w-8 h-8 text-green-500" />
            <span className="text-sm text-gray-500">دریافتی</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(earnings.paid)}</p>
          <div className="text-sm text-gray-600 mt-2">
            {((earnings.paid / earnings.total) * 100).toFixed(0)}٪ از کل
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border-2 border-yellow-200">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-yellow-500" />
            <span className="text-sm text-gray-500">در انتظار</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(earnings.pending)}</p>
          <div className="text-sm text-gray-600 mt-2">
            {earnings.transactions.filter(t => t.status === 'pending').length} فاکتور
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="font-bold">تراکنش‌های اخیر</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-right p-3 text-sm">شماره فاکتور</th>
                <th className="text-right p-3 text-sm">خدمات</th>
                <th className="text-center p-3 text-sm">تاریخ</th>
                <th className="text-center p-3 text-sm">مبلغ</th>
                <th className="text-center p-3 text-sm">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {earnings.transactions.slice(0, 10).map((transaction: any) => (
                <tr key={transaction.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-sm">
                    {transaction.invoice_number}
                  </td>
                  <td className="p-3 text-sm">
                    {transaction.request?.service?.name_fa || 'خدمات عمومی'}
                  </td>
                  <td className="p-3 text-sm text-center">
                    {new Date(transaction.issued_date).toLocaleDateString('fa-IR')}
                  </td>
                  <td className="p-3 text-sm text-center font-medium">
                    {(transaction.total_amount / 1000).toLocaleString()} هزار
                  </td>
                  <td className="p-3 text-sm text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(transaction.status)}`}>
                      {getStatusLabel(transaction.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}