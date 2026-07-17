/**
 * Standard API error used across the service.
 *
 * Carrying a status code and machine-readable code lets route handlers
 * return consistent responses without leaking sensitive details.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof Error && err.name === 'ApiError';
}
