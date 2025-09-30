'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TechnicianStats } from '@/components/technician/Stats'
import { JobQueue } from '@/components/technician/JobQueue'
import { Schedule } from '@/components/technician/Schedule'
import { EarningsOverview } from '@/components/technician/Earnings'
import { MapView } from '@/components/technician/MapView'
import { Bell, Power, Calendar, DollarSign, Map } from 'lucide-react'

export default function TechnicianDashboard() {
  const [activeTab, setActiveTab] = useState('queue')
  type TechnicianProfile = {
    id: string
    status: 'available' | 'busy' | 'offline'
    profile?: {
      full_name?: string
      [key: string]: any
    }
    [key: string]: any
  }

  const [technicianData, setTechnicianData] = useState<TechnicianProfile | null>(null)
  const [status, setStatus] = useState<'available' | 'busy' | 'offline'>('offline')
  
  const supabase = createClient()

  useEffect(() => {
    loadTechnicianData()
  }, [])

  const loadTechnicianData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('technicians')
        .select('*, profile:profiles(*)')
        .eq('id', user.id)
        .single()
      
      setTechnicianData(data)
      setStatus(data.status)
    }
  }

  const toggleStatus = async () => {
    const newStatus = status === 'offline' 
      ? 'available' 
      : status === 'available' 
      ? 'busy' 
      : 'offline'
    
    setStatus(newStatus)
    
    if (technicianData?.id) {
      await supabase
        .from('technicians')
        .update({ status: newStatus })
        .eq('id', technicianData.id)
    }
  }

  const tabs = [
    { id: 'queue', label: 'صف کارها', icon: Bell },
    { id: 'schedule', label: 'برنامه زمانی', icon: Calendar },
    { id: 'map', label: 'نقشه', icon: Map },
    { id: 'earnings', label: 'درآمد', icon: DollarSign },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">پنل تکنسین</h1>
              <p className="text-gray-600">
                خوش آمدید، {technicianData?.profile?.full_name}
              </p>
            </div>
            
            {/* Status Toggle */}
            <button
              onClick={toggleStatus}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                status === 'available' 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : status === 'busy'
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Power className="w-5 h-5" />
              {status === 'available' && 'آماده کار'}
              {status === 'busy' && 'مشغول'}
              {status === 'offline' && 'غیرفعال'}
            </button>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="container mx-auto px-4 py-6">
        <TechnicianStats technicianId={technicianData?.id} />
      </div>

      {/* Tabs */}
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-t-xl">
          <div className="flex border-b">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-all ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-xl p-6 min-h-[500px]">
          {activeTab === 'queue' && <JobQueue technicianId={technicianData?.id} />}
          {activeTab === 'schedule' && <Schedule technicianId={technicianData?.id} />}
          {activeTab === 'map' && <MapView technicianId={technicianData?.id} />}
          {activeTab === 'earnings' && <EarningsOverview technicianId={technicianData?.id} />}
        </div>
      </div>
    </div>
  )
}