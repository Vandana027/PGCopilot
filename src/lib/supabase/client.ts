import { createBrowserClient } from '@supabase/ssr'

function getSupabaseKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  )
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = getSupabaseKey()

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables.')
  }

  return createBrowserClient(url, key)
}
