import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserProfile = {
  id: string
  email: string
  full_name: string | null
  role: 'loan_officer' | 'risk_manager'
  created_at: string
  updated_at: string
}

export type User = {
  id: string
  email: string
  profile: UserProfile
}
