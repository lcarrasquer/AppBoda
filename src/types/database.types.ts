export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          owner_id: string
          slug: string
          bride_name: string
          groom_name: string
          event_date: string
          location: string | null
          wifi_ssid: string | null
          wifi_password: string | null
          primary_color: string | null
          logo_url: string | null
          watermark_url: string | null
          pin_code: string | null
          pin_enabled: boolean | null
          plan: string | null
          status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: { /*...*/ }
        Update: { /*...*/ }
      }
      guests: {
        Row: {
          id: string
          event_id: string
          user_id: string | null
          full_name: string
          created_at: string | null
        }
        Insert: { /*...*/ }
        Update: { /*...*/ }
      }
      photos: {
        Row: {
          id: string
          event_id: string
          guest_id: string
          challenge_id: string | null
          storage_path: string
          watermarked_path: string | null
          is_hidden: boolean | null
          likes_count: number | null
          created_at: string | null
        }
        Insert: { /*...*/ }
        Update: { /*...*/ }
      }
      // Se añadirán el resto de tablas aquí usando la CLI de Supabase
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
