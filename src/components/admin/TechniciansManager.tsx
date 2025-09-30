'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  UserPlus,
  Search,
  Star,
  MapPin,
  Phone,
  Mail,
  Activity,
  DollarSign,
  CheckCircle
} from 'lucide-react'

export function TechniciansManager() {
  const [technicians, setTechnicians] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadTechnicians()
  }, [])

  const loadTechnicians = async () => {
    const { data, error } = await supabase
      .from('technicians')
      .select(`
        *,
        profile:profiles(*)
      `)
      .order('created_at', { ascending: false })

    if (data) {
      setTechnicians(data)
    }
    setLoading(false)
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      available: 'bg-green-100 text-green-800',
      busy: 'bg-yellow-100 text-yellow-800',
      offline: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      available: 'آماده',
      busy: 'مشغول',
      offline: 'غیرفعال'
    }
    return labels[status] || status
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">مدیریت تکنسین‌ها</h2>
        
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          افزودن تکنسین جدید
        </button>
      </div>

      {/* Technicians Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {technicians.map(technician => (
          <div key={technician.id} className="border rounded-lg p-4 hover:shadow-md transition">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                {technician.profile?.avatar_url ? (
                  <img
                    src={technician.profile.avatar_url}
                    alt={technician.profile.full_name}
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-500">
                      {technician.profile?.full_name?.[0]}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-bold">{technician.profile?.full_name}</p>
                  <p className="text-sm text-gray-500">کد: {technician.employee_id}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(technician.status)}`}>
                {getStatusLabel(technician.status)}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4" />
                {technician.profile?.phone}
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                {technician.coverage_areas?.join('، ') || 'تعیین نشده'}
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <Star className="w-4 h-4 text-yellow-500" />
                {technician.rating?.toFixed(1) || '0.0'} ({technician.total_jobs} کار)
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <DollarSign className="w-4 h-4" />
                {technician.hourly_rate ? `${technician.hourly_rate.toLocaleString()} تومان/ساعت` : '-'}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t flex gap-2">
              <button className="flex-1 px-3 py-1 bg-blue-50 text-blue-600 rounded text-sm hover:bg-blue-100">
                مشاهده جزئیات
              </button>
              <button className="flex-1 px-3 py-1 bg-gray-50 text-gray-600 rounded text-sm hover:bg-gray-100">
                ویرایش
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}