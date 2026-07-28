import type { NextRequest } from "next/server";

type RateLimitEntry = { count: number; resetTime: number };

/**
 * Creates an independent in-memory rate limiter (its own Map, its own budget).
 * Call once per route module so each API route gets a separate quota instead
 * of sharing one counter across unrelated endpoints.
 */
export function createRateLimiter(maxRequests: number, windowMs: number) {
  const rateLimitMap = new Map<string, RateLimitEntry>();

  return function rateLimit(ip: string): boolean {
    const now = Date.now();
    const current = rateLimitMap.get(ip);

    if (!current || now > current.resetTime) {
      rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (current.count >= maxRequests) {
      return false;
    }

    current.count++;
    return true;
  };
}

export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}
