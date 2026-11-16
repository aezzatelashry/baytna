/**
 * price-search: the family types an item, Claude searches the chains' own Saudi websites
 * for current prices and reports them through one strict tool. Runs on Supabase Edge
 * Functions (Deno). The Anthropic key lives only here, as the secret ANTHROPIC_API_KEY.
 *
 * Deploy: supabase functions deploy price-search
 * Secret: supabase secrets set ANTHROPIC_API_KEY=...
 */
import Anthropic from 'npm:@anthropic-ai/sdk';

import { json, requiredEnv, serve, signedInClient, withinDailyLimit } from '../_shared/http.ts';
import { runSearch } from '../_shared/offer-search.ts';
import { keepSourcedOffers } from '../price-search/offers.ts';

const MIN_QUERY = 2;
const MAX_QUERY = 80;

async function handle(request: Request): Promise<Response> {
  const supabase = await signedInClient(request);
  if (!supabase) return json({ error: 'unauthorized' }, 401);

  const body: unknown = await request.json().catch(() => null);
  const raw = typeof body === 'object' && body !== null ? (body as { query?: unknown }).query : undefined;
  const query = typeof raw === 'string' ? raw.trim() : '';
  if (query.length < MIN_QUERY || query.length > MAX_QUERY) return json({ error: 'invalid_query' }, 400);

  if (!(await withinDailyLimit(supabase))) return json({ error: 'daily_limit' }, 429);

  const anthropic = new Anthropic({ apiKey: requiredEnv('ANTHROPIC_API_KEY') });
  const { reported, seenUrls } = await runSearch(anthropic, query);
  return json({ offers: keepSourcedOffers(reported, seenUrls) });
}

serve('price-search', handle);
