// Database types matching memareh schema

export interface Service {
  id: string
  name_fa: string
  slug: string
  description: string | null
  category: 'installation' | 'repair' | 'maintenance' | 'emergency' | 'inspection'
  base_price: number | null
  price_unit: string | null
  estimated_duration: number | null
  requires_site_visit: boolean | null
  is_emergency: boolean | null
  icon: string | null
  image_url: string | null
  popular: boolean | null
  active: boolean | null
  metadata: any | null
  created_at: string | null
}

export interface Profile {
  id: string
  full_name: string
  phone: string
  alternate_phone: string | null
  email: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  role: 'customer' | 'technician' | 'admin' | null
  status: 'active' | 'inactive' | 'suspended' | null
  avatar_url: string | null
  national_id: string | null
  created_at: string | null
  updated_at: string | null
}

export interface ServiceRequest {
  id?: string
  request_number?: string
  customer_id: string
  service_id: string | null
  technician_id?: string | null
  title: string
  description: string
  images?: string[] | null
  property_type: 'apartment' | 'house' | 'office' | 'shop' | 'warehouse' | 'factory' | 'other'
  address: string
  city: string
  postal_code?: string | null
  location_details?: string | null
  coordinates?: any | null
  requested_date: string
  requested_time_slot?: string | null
  scheduled_datetime?: string | null
  completed_at?: string | null
  status?: 'pending' | 'confirmed' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'
  priority?: 'low' | 'normal' | 'high' | 'emergency'
  is_emergency?: boolean
  estimated_cost?: number | null
  final_cost?: number | null
  parts_cost?: number | null
  labor_cost?: number | null
  emergency_fee?: number | null
  discount?: number | null
  tax?: number | null
  notes?: string | null
  cancellation_reason?: string | null
  rating?: number | null
  review?: string | null
  created_at?: string | null
  updated_at?: string | null
}

// UI-specific types
export interface ServiceWithIcon extends Service {
  iconComponent?: any
}

export interface BookingFormData {
  service: string
  description: string
  propertyType: string
  address: string
  city: string
  postalCode?: string
  date: Date
  timeSlot: string
  isEmergency: boolean
  images?: string[]
  locationDetails?: string
}
