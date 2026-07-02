import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing Supabase env vars. Copy .env.example to .env.local and fill VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.',
  )
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/** Fire-and-forget activity log */
export async function logActivity(
  action: string,
  entity: string,
  entityId?: string,
  detail?: Record<string, unknown>,
) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action,
      entity,
      entity_id: entityId ?? null,
      detail: detail ?? null,
    })
  } catch {
    /* non-blocking */
  }
}
