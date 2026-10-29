interface BucketEntry {
  timestamps: number[];
}

const buckets = new Map<string, BucketEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  namespace: string,
  identifier: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const key = `${namespace}:${identifier}`;
  const existing = buckets.get(key) || { timestamps: [] };

  const cutoff = now - windowMs;
  const active = existing.timestamps.filter((t) => t > cutoff);

  if (active.length >= maxRequests) {
    const oldest = active[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000)
    );
    buckets.set(key, { timestamps: active });
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  active.push(now);
  buckets.set(key, { timestamps: active });

  if (buckets.size > 5000) {
    for (const [k, v] of buckets.entries()) {
      if (v.timestamps.every((t) => t <= cutoff)) {
        buckets.delete(k);
      }
    }
  }

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - active.length),
    retryAfterSeconds: 0,
  };
}

export function resetRateLimitsForTests(): void {
  buckets.clear();
}
