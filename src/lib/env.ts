/**
 * Environment variables that are safe to read from both Node.js and Edge runtimes.
 */

export const GLOBAL_ALLOWED_ORIGINS =
  process.env.ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
