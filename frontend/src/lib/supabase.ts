import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// VITE_* variables are inlined at BUILD time, not read at runtime. On Vercel that
// means changing them in project settings has no effect until a redeploy. Failing
// here with a specific message beats the library's bare "supabaseUrl is required".
if (!url || !anonKey) {
  const missing = [
    !url && 'VITE_SUPABASE_URL',
    !anonKey && 'VITE_SUPABASE_ANON_KEY',
  ]
    .filter(Boolean)
    .join(' and ')

  throw new Error(
    `Missing ${missing}. Locally: add it to frontend/.env and restart the dev server. ` +
      `On Vercel: set it under Settings → Environment Variables, then redeploy ` +
      `(env changes only take effect on a new build).`
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // OAuth and magic links come back with the session in the URL fragment;
    // this parses it and then strips it from the address bar.
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
})
