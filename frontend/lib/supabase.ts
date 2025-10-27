import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Check if DEV_MODE is enabled
const isDevMode = process.env.DEV_MODE === 'true'
const devAccessToken = process.env.DEV_ACCESS_TOKEN

// Client-side Supabase client (for browser)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// DEV_MODE: Create a client with hardcoded access token if in dev mode
export const getSupabaseClient = () => {
  if (isDevMode && devAccessToken) {
    // Create client with the hardcoded token for DEV_MODE
    return createBrowserClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${devAccessToken}`
        }
      }
    })
  }
  return supabase
}

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
