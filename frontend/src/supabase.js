import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ajtwquvnwwrguimqosbj.supabase.co'
const supabaseAnonKey = 'sb_publishable_rnbKWN4ojJGcMyTLefapXQ_BZGprTdH'

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)