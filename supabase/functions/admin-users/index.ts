// Supabase Edge Function: admin-users
// Owner-only endpoint to create users and reset passwords using the service role key.
// Deploy:  supabase functions deploy admin-users
// Requires secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (set automatically by Supabase),
//                   and the caller must be an authenticated 'owner'.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify caller is an active owner
    const authHeader = req.headers.get('Authorization') ?? ''
    const asUser = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await asUser.auth.getUser()
    if (!user) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(url, serviceKey)
    const { data: profile } = await admin.from('profiles').select('role,is_active').eq('id', user.id).single()
    if (profile?.role !== 'owner' || !profile?.is_active) return json({ error: 'Forbidden — owner only' }, 403)

    const body = await req.json()
    const { action } = body

    if (action === 'create') {
      const { email, password, full_name, role, can_view_finance } = body
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role },
      })
      if (error) return json({ error: error.message }, 400)
      // ensure profile fields (trigger creates base row)
      await admin.from('profiles').update({ full_name, role, can_view_finance: !!can_view_finance }).eq('id', data.user.id)
      return json({ ok: true, id: data.user.id })
    }

    if (action === 'reset_password') {
      const { user_id, password } = body
      const { error } = await admin.auth.admin.updateUserById(user_id, { password })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    if (action === 'delete') {
      const { user_id } = body
      const { error } = await admin.auth.admin.deleteUser(user_id)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
