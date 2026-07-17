import { NextRequest } from 'next/server';
import { validateApiKey } from '../firestore/apiKeys';
import { AuthenticatedApiKey } from '../types';
import { ApiError } from '../utils/errors';

/**
 * Request authentication layer.
 *
 * Reads the `x-api-key` header and the request origin, then validates them
 * against the Firestore `api_keys` collection.
 */

/**
 * Extract the origin from the request headers.
 * Browsers send `origin` on cross-origin POSTs; fall back to `referer`.
 */
function getRequestOrigin(req: NextRequest): string | undefined {
  return req.headers.get('origin') ?? req.headers.get('referer') ?? undefined;
}

/**
 * Authenticate a request and return the resolved API-key document.
 *
 * @throws {ApiError} 401 if the key is missing or invalid; 403 if the origin is not allowed.
 */
export async function authenticateRequest(
  req: NextRequest,
): Promise<AuthenticatedApiKey> {
  const apiKey = req.headers.get('x-api-key');

  if (!apiKey) {
    throw new ApiError(
      'Missing x-api-key header',
      401,
      'MISSING_API_KEY',
    );
  }

  const origin = getRequestOrigin(req);
  const apiKeyDoc = await validateApiKey(apiKey, origin ?? undefined);

  if (!apiKeyDoc) {
    throw new ApiError(
      'Invalid API key or origin not allowed',
      401,
      'INVALID_API_KEY',
    );
  }

  return { apiKeyDoc };
}
