import { NextRequest } from 'next/server';
import { getAuthInstance } from '../firebase';
import { ApiError } from '../utils/errors';
import { AuthenticatedUser } from '../types';

/**
 * Authenticate a request using a Firebase ID token.
 *
 * The client must send the token in the Authorization header:
 *   Authorization: Bearer <idToken>
 *
 * The resolved Firebase Auth uid is used as the user identifier for key
 * derivation and usage logging.
 */

/**
 * Extract the Firebase ID token from the Authorization header.
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
 * Verify the Firebase ID token and return the authenticated user.
 *
 * @throws {ApiError} 401 if the token is missing or invalid.
 */
export async function authenticateRequest(
  req: NextRequest,
): Promise<AuthenticatedUser> {
  const idToken = getBearerToken(req);

  if (!idToken) {
    throw new ApiError(
      'Missing or invalid Authorization header. Expected: Bearer <idToken>',
      401,
      'UNAUTHORIZED',
    );
  }

  try {
    const decoded = await getAuthInstance().verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email ?? undefined };
  } catch (error) {
    console.error('verifyIdToken failed:', error);
    throw new ApiError(
      'Invalid or expired Firebase ID token',
      401,
      'UNAUTHORIZED',
    );
  }
}
