import { createClient } from '@supabase/supabase-js'

// These will be replaced by actual environment variables later
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

console.log('--- Supabase Configuration Check ---')
console.log('Supabase URL:', supabaseUrl ? 'Configured (' + supabaseUrl.substring(0, 15) + '...)' : 'MISSING ❌')
console.log('Supabase Anon Key:', supabaseAnonKey ? 'Configured' : 'MISSING ❌')

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('CRITICAL: Supabase credentials are missing! This APK will not be able to connect to the backend.')
    console.warn('HINT: Ensure your .env file is in the frontend folder BEFORE running "npm run build".')
}
console.log('------------------------------------')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
