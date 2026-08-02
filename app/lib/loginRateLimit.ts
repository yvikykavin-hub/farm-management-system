import { createClient } from "@supabase/supabase-js";

// Server-only rate limiting for the username-login endpoints, backed by a
// Supabase table (not an in-memory Map) so it actually works across the
// separate serverless instances a Vercel deployment can route requests to.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const TABLE = "login_rate_limits";

export type RateLimitResult = { allowed: true } | { allowed: false; remainingMinutes: number };

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const supabase = serviceClient();
  const now = Date.now();

  const { data: row } = await supabase
    .from(TABLE)
    .select("attempt_count, window_start, locked_until")
    .eq("identifier", identifier)
    .maybeSingle();

  if (!row) return { allowed: true };

  if (row.locked_until && new Date(row.locked_until).getTime() > now) {
    return { allowed: false, remainingMinutes: Math.ceil((new Date(row.locked_until).getTime() - now) / 60000) };
  }

  const windowStart = new Date(row.window_start).getTime();
  if (now - windowStart > WINDOW_MS) return { allowed: true };

  if (row.attempt_count >= MAX_ATTEMPTS) {
    return { allowed: false, remainingMinutes: 15 };
  }

  return { allowed: true };
}

export async function recordFailedAttempt(identifier: string): Promise<RateLimitResult> {
  const supabase = serviceClient();
  const now = Date.now();

  const { data: row } = await supabase
    .from(TABLE)
    .select("attempt_count, window_start")
    .eq("identifier", identifier)
    .maybeSingle();

  const windowStart = row ? new Date(row.window_start).getTime() : 0;
  const windowExpired = !row || now - windowStart > WINDOW_MS;
  const newCount = windowExpired ? 1 : (row!.attempt_count ?? 0) + 1;
  const lockedUntil = newCount >= MAX_ATTEMPTS ? new Date(now + WINDOW_MS).toISOString() : null;

  await supabase.from(TABLE).upsert({
    identifier,
    attempt_count: newCount,
    window_start: windowExpired ? new Date(now).toISOString() : new Date(windowStart).toISOString(),
    locked_until: lockedUntil,
    updated_at: new Date(now).toISOString(),
  });

  if (lockedUntil) return { allowed: false, remainingMinutes: 15 };
  return { allowed: true };
}

export async function clearRateLimit(identifier: string): Promise<void> {
  const supabase = serviceClient();
  await supabase.from(TABLE).delete().eq("identifier", identifier);
}
