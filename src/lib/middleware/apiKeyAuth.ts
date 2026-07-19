import { NextRequest } from 'next/server';
import { findUserByApiKey } from '../firestore/users';
import {
  clearFailedAuthAttempts,
  isApiKeyAllowed,
  isIpAllowed,
  isIpBlockedForAuthFailures,
  recordFailedAuthAttempt,
} from '../rateLimit';
import { ApiError } from '../utils/errors';
import { isIpAllowedByList } from '../utils/ip';
import { isValidApiKeyFormat } from '../utils/validation';
import { AuthenticatedUser, ApiKeyScope } from '../types';

/**
 * Authenticate a request using an API key and enforce rate limits / origin rules.
 *
 * The client must send the key in the Authorization header:
 *   Authorization: Bearer <apiKey>
 *
 * The resolved user uid is used as the user identifier for key derivation
 * and usage logging.
 */

/**
 * Extract the API key from the Authorization header.
 */
function getBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

function normalizeOrigin(origin: string | null): string | null {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    return `${url.protocol}//${url.host}`;
  } catch {
    return origin;
  }
}

function isOriginAllowed(
  allowed: string[] | undefined,
  origin: string | null,
): boolean {
  if (!allowed || allowed.length === 0) return true;
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  return allowed.some((allowedOrigin) => {
    if (allowedOrigin.endsWith('/*')) {
      const prefix = allowedOrigin.slice(0, -1);
      return normalized === prefix || normalized.startsWith(prefix);
    }
    return allowedOrigin === normalized;
  });
}

function isScopeAllowed(
  allowed: ApiKeyScope[] | undefined,
  required: ApiKeyScope,
): boolean {
  if (!allowed || allowed.length === 0) return true;
  return allowed.includes(required);
}

/**
 * Verify the API key against the api_keys collection, apply rate limits,
 * origin restrictions, and return the authenticated user.
 *
 * @throws {ApiError} 401 if the key is missing or invalid.
 * @throws {ApiError} 429 if rate limits are exceeded.
 * @throws {ApiError} 403 if the origin, IP, or scope is not allowed for this key.
 */
export async function authenticateRequest(
  req: NextRequest,
  requiredScope?: ApiKeyScope,
): Promise<AuthenticatedUser> {
  const ip = req.ip ?? req.headers.get('x-forwarded-for') ?? 'unknown';

  // Brute-force guard: block an IP that has recently racked up too many
  // failed API key attempts, before doing any further work (key parsing,
  // Firestore lookups, etc). This is checked ahead of the normal per-key /
  // per-IP request rate limits below, which protect against high-volume
  // traffic rather than credential guessing specifically.
  if (isIpBlockedForAuthFailures(ip)) {
    throw new ApiError(
      'Too many failed authentication attempts from this IP address. Please try again later.',
      429,
      'AUTH_TEMPORARILY_BLOCKED',
    );
  }

  const apiKey = getBearerToken(req);

  if (!apiKey || !isValidApiKeyFormat(apiKey)) {
    recordFailedAuthAttempt(ip);
    throw new ApiError(
      'Missing or invalid Authorization header. Expected: Bearer <apiKey>',
      401,
      'UNAUTHORIZED',
    );
  }

  if (!isIpAllowed(ip)) {
    throw new ApiError(
      'Too many requests from this IP address. Please slow down.',
      429,
      'RATE_LIMITED',
    );
  }

  if (!isApiKeyAllowed(apiKey)) {
    throw new ApiError(
      'API key rate limit exceeded. Please slow down.',
      429,
      'RATE_LIMITED',
    );
  }

  const user = await findUserByApiKey(apiKey);

  if (!user) {
    // Unknown or revoked key: this is exactly the kind of credential-guessing
    // failure the brute-force counter exists for.
    recordFailedAuthAttempt(ip);
    throw new ApiError(
      'Invalid or revoked API key',
      401,
      'UNAUTHORIZED',
    );
  }

  const origin = req.headers.get('origin');
  if (!isOriginAllowed(user.allowed_origins, origin)) {
    // A valid key used from an unexpected origin is an authorization
    // mismatch, not a credential-guessing attempt, so it is not recorded
    // against the brute-force counter.
    throw new ApiError(
      'This API key is not allowed for the requesting origin',
      403,
      'FORBIDDEN_ORIGIN',
    );
  }

  if (!isIpAllowedByList(ip, user.allowed_ips)) {
    throw new ApiError(
      'This API key is not allowed for the requesting IP address',
      403,
      'FORBIDDEN_IP',
    );
  }

  if (requiredScope && !isScopeAllowed(user.scopes, requiredScope)) {
    throw new ApiError(
      `This API key does not have permission to use the ${requiredScope} endpoint`,
      403,
      'FORBIDDEN_SCOPE',
    );
  }

  // Successful authentication: clear any prior failed-attempt history for
  // this IP so a legitimate user who mistyped a key earlier is never
  // penalized once they authenticate correctly.
  clearFailedAuthAttempts(ip);

  return { uid: user.uid, email: user.email ?? undefined };
}
