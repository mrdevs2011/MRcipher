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

/**
 * Brute-force protection: tracks failed API key authentication attempts
 * (invalid format, unknown key, revoked key) per IP address.
 *
 * This is intentionally separate from the general request rate limiter
 * above: that limiter is keyed by the exact API key string, so an attacker
 * guessing many different keys would never hit the same bucket twice. This
 * counter is keyed by IP instead, so repeated guessing from one source is
 * caught regardless of how many different keys are tried.
 *
 * Only credential-guessing failures should be recorded here (missing/
 * malformed/unknown/revoked key). Authorization failures for an otherwise
 * valid key (wrong origin, wrong IP, missing scope) should NOT be recorded,
 * since that would risk locking out a legitimate key holder over a
 * configuration mismatch rather than an actual attack.
 */

const FAILED_AUTH_WINDOW_MS = 5 * 60_000; // 5 minutes
const FAILED_AUTH_MAX = 15; // failed key attempts per IP within the window

const failedAuthBuckets = new Map<string, Bucket>();

function getFailedAuthBucket(ip: string): Bucket {
  const bucket = failedAuthBuckets.get(ip);
  const t = now();
  if (!bucket || t > bucket.resetAt) {
    const fresh = { count: 0, resetAt: t + FAILED_AUTH_WINDOW_MS };
    failedAuthBuckets.set(ip, fresh);
    return fresh;
  }
  return bucket;
}

/**
 * Check whether an IP has already exceeded the allowed number of failed
 * authentication attempts within the current window. This check does not
 * itself count as an attempt, so it is safe to call before validating the
 * request.
 */
export function isIpBlockedForAuthFailures(ip: string | null): boolean {
  if (!ip) return false;
  const bucket = failedAuthBuckets.get(ip);
  if (!bucket) return false;
  if (now() > bucket.resetAt) return false;
  return bucket.count >= FAILED_AUTH_MAX;
}

/**
 * Record a failed authentication attempt (invalid format, unknown key, or
 * revoked key) for an IP. Successful authentications must not call this.
 */
export function recordFailedAuthAttempt(ip: string | null): void {
  if (!ip) return;
  const bucket = getFailedAuthBucket(ip);
  bucket.count += 1;
}

/**
 * Clear failed-auth tracking for an IP after a successful authentication.
 * This ensures a legitimate user who mistypes a key once or twice is never
 * penalized once they authenticate correctly.
 */
export function clearFailedAuthAttempts(ip: string | null): void {
  if (!ip) return;
  failedAuthBuckets.delete(ip);
}

