// Minimal in-memory token bucket per user id. Good enough for a single Fly VM
// and low traffic. Caveat: with multiple app instances the limit is per-instance,
// so the effective limit is roughly `limit * instance_count`. If you scale out,
// back this with Redis (or Fly's rate-limiting middleware) instead.
//
// Usage:
//   if (!rateLimit(locals.user.id, { max: 1, windowMs: 10_000 })) return tooManyRequests();

type Bucket = { count: number; reset: number };

const buckets = new Map<string, Bucket>();

// Periodic cleanup so the map doesn't grow unbounded over time.
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

export function rateLimit(
	key: string,
	{ max, windowMs }: { max: number; windowMs: number }
): boolean {
	const now = Date.now();

	if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
		for (const [k, b] of buckets) {
			if (b.reset <= now) buckets.delete(k);
		}
		lastCleanup = now;
	}

	const existing = buckets.get(key);
	if (!existing || existing.reset <= now) {
		buckets.set(key, { count: 1, reset: now + windowMs });
		return true;
	}

	if (existing.count >= max) return false;
	existing.count += 1;
	return true;
}
