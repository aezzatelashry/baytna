/** Request plumbing shared by the AI functions: CORS, JSON replies, sign-in and the daily cap. */
import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

export function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

/** A client that acts as the signed-in caller, or null when the request carries no valid session. */
export async function signedInClient(request: Request): Promise<SupabaseClient | null> {
  const authorization = request.headers.get('Authorization');
  if (!authorization) return null;
  const supabase = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
  });
  const { data } = await supabase.auth.getUser();
  return data.user ? supabase : null;
}

/**
 * Records this AI call and says whether it is allowed. The database function checks
 * the per-user and the whole-project daily caps in one step (see price-search.sql).
 */
export async function withinDailyLimit(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc('claim_price_search');
  if (error) throw new Error(error.message);
  return data === true;
}

/** Wraps a POST handler with CORS, method checks and error replies that leak no detail. */
export function serve(name: string, handle: (request: Request) => Promise<Response>): void {
  Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    try {
      return await handle(request);
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 429);
      if (error instanceof Anthropic.APIError) return json({ error: 'ai_failed' }, 502);
      // The detail stays in the function log; the phone gets a generic message.
      console.error(`${name} failed`, error instanceof Error ? error.message : error);
      return json({ error: 'server_error' }, 500);
    }
  });
}
