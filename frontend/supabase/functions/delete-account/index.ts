/**
 * Deletes the calling user's account.
 *
 * The Settings page previously wired its "Delete account" button straight to
 * signOut, so the app claimed to delete data it never touched. Actually
 * removing an auth user needs the service-role key, which cannot be shipped to
 * the browser — hence this function.
 *
 * The user is identified from their JWT, never from the request body, so one
 * user cannot delete another.
 *
 * Deploy: supabase functions deploy delete-account
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing authorization header' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Resolve the caller from their own token.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()

    if (userError || !user) {
      return json({ error: 'Invalid or expired session' }, 401)
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // user_preferences cascades on auth.users delete. checkins and
    // visit_feedback are ON DELETE SET NULL, so the crowdsourced history that
    // other patients depend on survives, unlinked from this user.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
    if (deleteError) {
      return json({ error: deleteError.message }, 500)
    }

    return json({ success: true }, 200)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Unexpected error' }, 500)
  }
})
