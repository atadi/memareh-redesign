// Database types based on memareh schema
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ArticleStatus = 'draft' | 'published' | 'archived' | 'scheduled'

export interface ArticleTag {
  id: string
  name: string
  slug: string
  created_at: string | null
}

export interface ArticleRow {
  id: string
  title: string
  slug: string | null
  excerpt: string | null
  content: string | null
  featured_image: string | null
  featured_image_alt: string | null
  category: string | null
  author_id: string | null
  author_name: string | null
  allow_comments: boolean | null
  status: ArticleStatus
  meta_title: string | null
  meta_description: string | null
  meta_keywords: string[] | null
  canonical_url: string | null
  og_image: string | null
  reading_time: number | null
  view_count: number | null
  is_featured: boolean | null
  video_url: string | null
  scheduled_at: string | null
  published_at: string | null
  created_at: string | null
  updated_at: string | null
  tags?: ArticleTag[]
}

export interface Database {
  memareh: {
    Tables: {
      articles: {
        Row: ArticleRow
        Insert: {
          id?: string
          title: string
          slug?: string | null
          excerpt?: string | null
          content?: string | null
          featured_image?: string | null
          featured_image_alt?: string | null
          category?: string | null
          author_id?: string | null
          author_name?: string | null
          allow_comments?: boolean | null
          status?: ArticleStatus
          meta_title?: string | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          canonical_url?: string | null
          og_image?: string | null
          reading_time?: number | null
          view_count?: number | null
          is_featured?: boolean | null
          video_url?: string | null
          scheduled_at?: string | null
          published_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          slug?: string | null
          excerpt?: string | null
          content?: string | null
          featured_image?: string | null
          featured_image_alt?: string | null
          category?: string | null
          author_id?: string | null
          author_name?: string | null
          allow_comments?: boolean | null
          status?: ArticleStatus
          meta_title?: string | null
          meta_description?: string | null
          meta_keywords?: string[] | null
          canonical_url?: string | null
          og_image?: string | null
          reading_time?: number | null
          view_count?: number | null
          is_featured?: boolean | null
          video_url?: string | null
          scheduled_at?: string | null
          published_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      article_tags: {
        Row: ArticleTag
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string | null
        }
      }
      article_tag_relations: {
        Row: {
          article_id: string
          tag_id: string
          created_at: string | null
        }
        Insert: {
          article_id: string
          tag_id: string
          created_at?: string | null
        }
        Update: {
          article_id?: string
          tag_id?: string
          created_at?: string | null
        }
      }
      services: {
        Row: {
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
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name_fa: string
          slug: string
          description?: string | null
          category: 'installation' | 'repair' | 'maintenance' | 'emergency' | 'inspection'
          base_price?: number | null
          price_unit?: string | null
          estimated_duration?: number | null
          requires_site_visit?: boolean | null
          is_emergency?: boolean | null
          icon?: string | null
          image_url?: string | null
          popular?: boolean | null
          active?: boolean | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name_fa?: string
          slug?: string
          description?: string | null
          category?: 'installation' | 'repair' | 'maintenance' | 'emergency' | 'inspection'
          base_price?: number | null
          price_unit?: string | null
          estimated_duration?: number | null
          requires_site_visit?: boolean | null
          is_emergency?: boolean | null
          icon?: string | null
          image_url?: string | null
          popular?: boolean | null
          active?: boolean | null
          metadata?: Json | null
          created_at?: string | null
        }
      }
      service_requests: {
        Row: {
          id: string
          request_number: string
          customer_id: string
          service_id: string | null
          technician_id: string | null
          title: string
          description: string
          images: string[] | null
          property_type: 'apartment' | 'house' | 'office' | 'shop' | 'warehouse' | 'factory' | 'other'
          address: string
          city: string
          postal_code: string | null
          location_details: string | null
          coordinates: unknown | null
          requested_date: string
          requested_time_slot: string | null
          scheduled_datetime: string | null
          completed_at: string | null
          status: 'pending' | 'confirmed' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'
          priority: 'low' | 'normal' | 'high' | 'emergency'
          is_emergency: boolean | null
          estimated_cost: number | null
          final_cost: number | null
          parts_cost: number | null
          labor_cost: number | null
          emergency_fee: number | null
          discount: number | null
          tax: number | null
          notes: string | null
          cancellation_reason: string | null
          rating: number | null
          review: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          request_number: string
          customer_id: string
          service_id?: string | null
          technician_id?: string | null
          title: string
          description: string
          images?: string[] | null
          property_type: 'apartment' | 'house' | 'office' | 'shop' | 'warehouse' | 'factory' | 'other'
          address: string
          city: string
          postal_code?: string | null
          location_details?: string | null
          coordinates?: unknown | null
          requested_date: string
          requested_time_slot?: string | null
          scheduled_datetime?: string | null
          completed_at?: string | null
          status?: 'pending' | 'confirmed' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'
          priority?: 'low' | 'normal' | 'high' | 'emergency'
          is_emergency?: boolean | null
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
        Update: {
          id?: string
          request_number?: string
          customer_id?: string
          service_id?: string | null
          technician_id?: string | null
          title?: string
          description?: string
          images?: string[] | null
          property_type?: 'apartment' | 'house' | 'office' | 'shop' | 'warehouse' | 'factory' | 'other'
          address?: string
          city?: string
          postal_code?: string | null
          location_details?: string | null
          coordinates?: unknown | null
          requested_date?: string
          requested_time_slot?: string | null
          scheduled_datetime?: string | null
          completed_at?: string | null
          status?: 'pending' | 'confirmed' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'disputed'
          priority?: 'low' | 'normal' | 'high' | 'emergency'
          is_emergency?: boolean | null
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
      }
      profiles: {
        Row: {
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
      }
      article_comments: {
        Row: {
          id: string
          article_id: string
          user_id: string
          parent_id: string | null
          content: string
          status: 'pending' | 'approved' | 'rejected'
          rejection_reason: string | null
          approved_by: string | null
          approved_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          article_id: string
          user_id: string
          parent_id?: string | null
          content: string
          status?: 'pending' | 'approved' | 'rejected'
          rejection_reason?: string | null
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          article_id?: string
          user_id?: string
          parent_id?: string | null
          content?: string
          status?: 'pending' | 'approved' | 'rejected'
          rejection_reason?: string | null
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      comment_likes: {
        Row: {
          comment_id: string
          user_id: string
          created_at: string | null
        }
        Insert: {
          comment_id: string
          user_id: string
          created_at?: string | null
        }
        Update: {
          comment_id?: string
          user_id?: string
          created_at?: string | null
        }
      }
    }
    Views: {
      article_tags_view: {
        Row: {
          article_id: string
          tags: Json
        }
      }
    }
    Functions: {
      increment_article_view: {
        Args: { article_uuid: string }
        Returns: void
      }
      search_articles: {
        Args: { search_query: string }
        Returns: ArticleRow[]
      }
      migrate_tags_to_relations: {
        Args: Record<string, never>
        Returns: string
      }
      auto_publish_scheduled: {
        Args: Record<string, never>
        Returns: number
      }
    }
    Enums: {}
  }
}
