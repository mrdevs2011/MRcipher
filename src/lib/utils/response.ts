import { NextResponse } from 'next/server';
import { isApiError, ApiError } from './errors';

/**
 * Standard JSON response builder.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: Record<string, unknown>;
}

const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred.';

/**
 * Build a successful JSON response.
 */
export function successResponse<T>(
  data: T,
  meta?: Record<string, unknown>,
  init?: ResponseInit,
): NextResponse {
  const body: ApiResponse<T> = {
    success: true,
    data,
    ...(meta && { meta }),
  };
  return NextResponse.json(body, init);
}

/**
 * Build an error JSON response.
 */
export function errorResponse(
  err: unknown,
  init?: ResponseInit,
): NextResponse {
  const statusCode = isApiError(err) ? err.statusCode : 500;
  const code = isApiError(err) ? err.code : 'INTERNAL_ERROR';
  const message =
    isApiError(err) && err.statusCode < 500
      ? err.message
      : DEFAULT_ERROR_MESSAGE;

  const body: ApiResponse = {
    success: false,
    error: { code, message },
  };

  return NextResponse.json(body, { ...init, status: statusCode });
}

/**
 * Server-side safe logger. Never prints the request body or API keys.
 */
export function logServerError(
  label: string,
  err: unknown,
  context?: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[MRcipher] ${label}`, err, context);
  }
}
