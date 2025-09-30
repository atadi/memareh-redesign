'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Service } from '@/types/database'

export function useServices() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchServices() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('active', true)
          .order('popular', { ascending: false })
          .order('name_fa', { ascending: true })

        if (error) throw error
        setServices(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطا در بارگذاری خدمات')
        console.error('Error fetching services:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [])

  return { services, loading, error }
}

export function useServiceById(id: string | null) {
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!id) {
      setService(null)
      setLoading(false)
      return
    }

    async function fetchService() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error
        setService(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطا در بارگذاری خدمت')
        console.error('Error fetching service:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchService()
  }, [id])

  return { service, loading, error }
}
