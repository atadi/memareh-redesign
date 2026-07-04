// Database types matching memareh schema

export interface ArticleTag {
  id: string
  name: string
  slug: string
}

export interface Article {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  featured_image: string | null
  featured_image_alt: string | null
  category: string | null
  author_id: string | null
  author_name: string | null
  allow_comments: boolean
  status: 'draft' | 'published' | 'archived' | 'scheduled'
  meta_title: string | null
  meta_description: string | null
  meta_keywords: string[] | null
  canonical_url: string | null
  og_image: string | null
  reading_time: number | null
  view_count: number
  is_featured: boolean
  video_url: string | null
  scheduled_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  tags?: ArticleTag[]
  averageRating?: number
  ratingCount?: number
  _count?: {
    comments: number
  }
}

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

export interface ArticleComment {
  id: string
  article_id: string
  user_id: string
  parent_id: string | null
  content: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string | null
  user?: {
    full_name: string
    avatar_url?: string
  }
  replies?: ArticleComment[]
}

export interface CommentLike {
  comment_id: string
  user_id: string
  created_at: string | null
}
