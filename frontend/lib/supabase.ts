import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

console.log('🔧 Supabase Config Check:');
console.log('🔧 URL exists:', !!supabaseUrl);
console.log('🔧 URL value:', supabaseUrl);
console.log('🔧 Key exists:', !!supabaseAnonKey);
console.log('🔧 Key starts with:', supabaseAnonKey?.substring(0, 10) + '...');

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Function to create a fresh Supabase client instance
export const createFreshSupabaseClient = () => {
  console.log('🔄 Creating fresh Supabase client...');
  return createClient(supabaseUrl, supabaseAnonKey);
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
