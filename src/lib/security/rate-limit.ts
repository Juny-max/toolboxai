import { NextRequest } from "next/server";

type Entry = {
  count: number;
  resetAt: number;
};

type Store = Map<string, Entry>;

declare global {
  var __toolboxRateLimitStore: Store | undefined;
}

const store: Store = globalThis.__toolboxRateLimitStore ?? new Map<string, Entry>();

if (!globalThis.__toolboxRateLimitStore) {
  globalThis.__toolboxRateLimitStore = store;
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
};

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const hasUpstashConfig = Boolean(upstashUrl && upstashToken);

export const getClientIp = (req: NextRequest): string => {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const vercelForwardedFor = req.headers.get("x-vercel-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || vercelForwardedFor?.split(",")[0]?.trim() || realIp?.trim() || "unknown";
  return ip;
};

export const getRateLimitIdentifier = (req: NextRequest): string => {
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? "unknown-agent";
  return `${ip}:${userAgent.slice(0, 120)}`;
};

const checkRateLimitInMemory = (
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): RateLimitResult => {
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
      resetAt,
    };
  }

  if (current.count >= limit) {
    const retryAfterSeconds = Math.max(Math.ceil((current.resetAt - now) / 1000), 1);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      resetAt: current.resetAt,
    };
  }

  current.count += 1;
  store.set(key, current);
  return {
    allowed: true,
    remaining: Math.max(limit - current.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
    resetAt: current.resetAt,
  };
};

const callUpstash = async <T>(command: Array<string | number>) => {
  const endpoint = `${upstashUrl}/${command
    .map((part) => encodeURIComponent(String(part)))
    .join("/")}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${upstashToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(2_500),
  });

  if (!response.ok) {
    throw new Error(`Upstash request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.result as T;
};

export const checkRateLimit = async (
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): Promise<RateLimitResult> => {
  if (!hasUpstashConfig) {
    return checkRateLimitInMemory(key, limit, windowMs, now);
  }

  const redisKey = `ratelimit:${key}`;

  try {
    const count = await callUpstash<number>(["INCR", redisKey]);

    if (count === 1) {
      await callUpstash<number>(["PEXPIRE", redisKey, windowMs]);
    }

    const ttlMs = await callUpstash<number>(["PTTL", redisKey]);
    const effectiveTtlMs = ttlMs > 0 ? ttlMs : windowMs;
    const resetAt = now + effectiveTtlMs;

    if (count > limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(Math.ceil(effectiveTtlMs / 1000), 1),
        resetAt,
      };
    }

    return {
      allowed: true,
      remaining: Math.max(limit - count, 0),
      retryAfterSeconds: Math.max(Math.ceil(effectiveTtlMs / 1000), 1),
      resetAt,
    };
  } catch {
    return checkRateLimitInMemory(key, limit, windowMs, now);
  }
};

export const withApiRateLimitHeaders = (headers: Headers, result: RateLimitResult) => {
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", String(Math.floor(result.resetAt / 1000)));
  headers.set("Retry-After", String(result.retryAfterSeconds));
};
