import { NextRequest } from 'next/server';
import { findUserByApiKey } from '../firestore/users';
import { isApiKeyAllowed, isIpAllowed } from '../rateLimit';
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
  const apiKey = getBearerToken(req);

  if (!apiKey || !isValidApiKeyFormat(apiKey)) {
    throw new ApiError(
      'Missing or invalid Authorization header. Expected: Bearer <apiKey>',
      401,
      'UNAUTHORIZED',
    );
  }

  const ip = req.ip ?? req.headers.get('x-forwarded-for') ?? 'unknown';
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
    throw new ApiError(
      'Invalid or revoked API key',
      401,
      'UNAUTHORIZED',
    );
  }

  const origin = req.headers.get('origin');
  if (!isOriginAllowed(user.allowed_origins, origin)) {
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

  return { uid: user.uid, email: user.email ?? undefined };
}
