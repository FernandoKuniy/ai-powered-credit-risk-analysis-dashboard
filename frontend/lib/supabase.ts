import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseRefreshToken = process.env.NEXT_PUBLIC_SUPABASE_REFRESH_TOKEN!

// Check if NEXT_PUBLIC_DEV_MODE is enabled
const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true'
const devAccessToken = process.env.NEXT_PUBLIC_DEV_ACCESS_TOKEN

// Client-side Supabase client (for browser)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// NEXT_PUBLIC_DEV_MODE: Create a client with hardcoded access token if in dev mode
export const getSupabaseClient = async () => {
  if (isDevMode && devAccessToken) {
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey)
    await client.auth.setSession({
      access_token: devAccessToken,
      refresh_token: supabaseRefreshToken
    })
    return client
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
