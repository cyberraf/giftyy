// Shared authentication helpers for Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

/**
 * Verify the request has a valid user JWT.
 * Returns the authenticated user or null if invalid.
 */
export async function verifyUserAuth(req: Request): Promise<{ user: any; error?: string }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return { user: null, error: 'Missing Authorization header' }
  }

  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error } = await supabaseClient.auth.getUser()
  if (error || !user) {
    return { user: null, error: error?.message || 'Invalid or expired token' }
  }

  return { user }
}

/**
 * Verify the request comes from an internal caller with service_role authorization.
 * Used for edge functions called from SQL triggers or other edge functions.
 * Returns true if the caller has service_role JWT.
 */
export function verifyServiceRole(req: Request): { authorized: boolean; error?: string } {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return { authorized: false, error: 'Missing Authorization header' }
  }

  try {
    const token = authHeader.replace('Bearer ', '')
    const parts = token.split('.')
    if (parts.length !== 3) {
      return { authorized: false, error: 'Invalid token format' }
    }
    const payload = JSON.parse(atob(parts[1]))
    if (payload.role !== 'service_role') {
      return { authorized: false, error: 'Forbidden: service_role required' }
    }
    return { authorized: true }
  } catch {
    return { authorized: false, error: 'Invalid authorization token' }
  }
}

/**
 * Create an unauthorized response with CORS headers.
 */
export function unauthorizedResponse(message: string, corsHeaders: Record<string, string>, status = 401): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
  )
}
