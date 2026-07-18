/**
 * Simple in-memory rate limiter for serverless environments.
 *
 * In a production deployment with multiple instances, replace this with
 * Redis or another shared store. For a single Vercel Hobby project the
 * in-memory map is acceptable because traffic is generally routed to a
 * single function instance per region.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000; // 1 minute
const DEFAULT_MAX = 100; // per API key per minute
const IP_MAX = 120; // per IP per minute (slightly higher, protects endpoint)

function now() {
  return Date.now();
}

function getBucket(key: string): Bucket {
  const bucket = buckets.get(key);
  const t = now();
  if (!bucket || t > bucket.resetAt) {
    const fresh = { count: 0, resetAt: t + WINDOW_MS };
    buckets.set(key, fresh);
    return fresh;
  }
  return bucket;
}

function isAllowed(bucket: Bucket, max: number): boolean {
  bucket.count += 1;
  return bucket.count <= max;
}

/**
 * Rate limit by API key.
 */
export function isApiKeyAllowed(apiKey: string): boolean {
  const bucket = getBucket(`key:${apiKey}`);
  return isAllowed(bucket, DEFAULT_MAX);
}

/**
 * Rate limit by client IP.
 */
export function isIpAllowed(ip: string | null): boolean {
  if (!ip) return true;
  const bucket = getBucket(`ip:${ip}`);
  return isAllowed(bucket, IP_MAX);
}

