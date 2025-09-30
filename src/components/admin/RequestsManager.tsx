'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Search, 
  Filter, 
  Calendar,
  MapPin,
  User,
  Clock,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'

export function RequestsManager() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadRequests()
  }, [filter])

  const loadRequests = async () => {
    let query = supabase
      .from('service_requests')
      .select(`
        *,
        customer:profiles!customer_id(full_name, phone),
        technician:technicians(
          profile:profiles(full_name)
        ),
        service:services(name_fa)
      `)
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query
    
    if (data) {
      setRequests(data)
    }
    setLoading(false)
  }

  const handleStatusChange = async (requestId: string, newStatus: string) => {
    const { error } = await supabase
      .from('service_requests')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (!error) {
      loadRequests()
    }
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      assigned: 'bg-purple-100 text-purple-800',
      in_progress: 'bg-indigo-100 text-indigo-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: 'در انتظار',
      confirmed: 'تایید شده',
      assigned: 'تکنسین تعیین شده',
      in_progress: 'در حال انجام',
      completed: 'تکمیل شده',
      cancelled: 'لغو شده'
    }
    return labels[status] || status
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">مدیریت درخواست‌ها</h2>
        
        {/* Filters */}
        <div className="flex gap-2">
          {['all', 'pending', 'in_progress', 'completed'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg transition ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'همه' : getStatusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute right-3 top-3 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="جستجو در درخواست‌ها..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-right py-3">شماره</th>
              <th className="text-right py-3">مشتری</th>
              <th className="text-right py-3">خدمات</th>
              <th className="text-center py-3">تاریخ</th>
              <th className="text-center py-3">وضعیت</th>
              <th className="text-center py-3">تکنسین</th>
              <th className="text-center py-3">مبلغ</th>
              <th className="text-center py-3">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {requests
              .filter(r => 
                searchTerm === '' || 
                r.request_number?.includes(searchTerm) ||
                r.customer?.full_name?.includes(searchTerm)
              )
              .map(request => (
                <tr key={request.id} className="border-b hover:bg-gray-50">
                  <td className="py-3">
                    <span className="font-mono text-sm">{request.request_number}</span>
                  </td>
                  <td className="py-3">
                    <div>
                      <p className="font-medium">{request.customer?.full_name}</p>
                      <p className="text-sm text-gray-500">{request.customer?.phone}</p>
                    </div>
                  </td>
                  <td className="py-3">{request.service?.name_fa || request.title}</td>
                  <td className="text-center py-3">
                    <div className="text-sm">
                      {new Date(request.requested_date).toLocaleDateString('fa-IR')}
                    </div>
                  </td>
                  <td className="text-center py-3">
                    <select
                      value={request.status}
                      onChange={(e) => handleStatusChange(request.id, e.target.value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}
                    >
                      <option value="pending">در انتظار</option>
                      <option value="confirmed">تایید شده</option>
                      <option value="assigned">تکنسین تعیین شده</option>
                      <option value="in_progress">در حال انجام</option>
                      <option value="completed">تکمیل شده</option>
                      <option value="cancelled">لغو شده</option>
                    </select>
                  </td>
                  <td className="text-center py-3">
                    {request.technician?.profile?.full_name || '-'}
                  </td>
                  <td className="text-center py-3">
                    {request.final_cost 
                      ? `${(request.final_cost / 1000).toFixed(0)}k`
                      : '-'
                    }
                  </td>
                  <td className="text-center py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded">
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded">
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}