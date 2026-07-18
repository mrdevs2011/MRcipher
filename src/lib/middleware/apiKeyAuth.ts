import { NextRequest } from 'next/server';
import { findUserByApiKey } from '../firestore/users';
import { ApiError } from '../utils/errors';
import { AuthenticatedUser } from '../types';

/**
 * Authenticate a request using an API key.
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

/**
 * Verify the API key against the api_keys collection and return the
 * authenticated user.
 *
 * @throws {ApiError} 401 if the key is missing or invalid.
 */
export async function authenticateRequest(
  req: NextRequest,
): Promise<AuthenticatedUser> {
  const apiKey = getBearerToken(req);

  if (!apiKey) {
    throw new ApiError(
      'Missing or invalid Authorization header. Expected: Bearer <apiKey>',
      401,
      'UNAUTHORIZED',
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

  return { uid: user.uid, email: user.email ?? undefined };
}
