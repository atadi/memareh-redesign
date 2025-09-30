import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Service = Database['memareh']['Tables']['services']['Row']

export async function getServices() {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('active', true)
    .order('popular', { ascending: false })
    .order('name_fa', { ascending: true })

  if (error) {
    console.error('Error fetching services:', error)
    throw error
  }

  return data as Service[]
}

export async function getServiceById(id: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .eq('active', true)
    .single()

  if (error) {
    console.error('Error fetching service:', error)
    throw error
  }

  return data as Service
}

export async function getServicesByCategory(category: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('category', category)
    .eq('active', true)
    .order('name_fa', { ascending: true })

  if (error) {
    console.error('Error fetching services by category:', error)
    throw error
  }

  return data as Service[]
}

export async function getEmergencyServices() {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_emergency', true)
    .eq('active', true)
    .order('name_fa', { ascending: true })

  if (error) {
    console.error('Error fetching emergency services:', error)
    throw error
  }

  return data as Service[]
}
