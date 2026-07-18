# MRcipher Security Checklist

This document records the defensive measures currently in place and the ones that are intentionally out of scope.

## Authentication & Authorization

- [x] Google Sign-In via Firebase Auth on the dashboard.
- [x] API key authentication for `/api/v1/*` endpoints.
- [x] API keys are hashed with SHA-256 before storage; only the prefix is kept.
- [x] Per-key **origin allowlist** with wildcard support (`https://example.com/*`).
- [x] Per-key **IP allowlist** with exact IP and CIDR support.
- [x] Per-key **endpoint scopes** (`encrypt`, `decrypt`, `health`, `usage`).
- [x] Rate limiting: 100 req/min per API key, 120 req/min per IP.

## Encryption

- [x] AES-256-GCM authenticated encryption.
- [x] Per-user deterministic key derived from `ENCRYPTION_MASTER_KEY + uid`.
- [x] Encrypted payload validation before decryption (base64, IV/tag length, version).

## Firestore Security

- [x] `firestore.rules` denies all client-side read/write by default.
- [x] Server-side access only via Firebase Admin SDK.
- [x] Composite indexes for `api_keys` and `logs` queries.

## Request Hardening

- [x] Maximum request body size: 512 KiB.
- [x] `Content-Type: application/json` enforcement for mutation endpoints.
- [x] API key format validation (`mr_...`, minimum length).
- [x] CORS origin header required for cross-origin browser requests.

## Headers & Transport

- [x] `X-Content-Type-Options: nosniff`
- [x] `X-Frame-Options: DENY`
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] `Permissions-Policy` with sensitive features disabled
- [x] Content-Security-Policy on static pages and test-client.
- [x] `Strict-Transport-Security` (HSTS) on static pages.
- [x] `poweredByHeader: false` in Next.js config.

## SDK

- [x] Universal client/server/React SDK.
- [x] Configurable request timeout.
- [x] Exponential backoff retry for transient network errors.
- [x] Auto-encrypt/decrypt configured fields.

## Monitoring & Logging

- [x] Usage logs written to Firestore (best-effort, never blocks requests).
- [x] Per-user usage aggregates for fast `/api/v1/usage` responses.
- [x] Server errors logged to Vercel console without leaking secrets.

## Out of Scope

The following are intentionally not implemented because this project is for personal use only:

- [ ] Billing/metered quotas.
- [ ] Webhook notifications.
- [ ] Audit log retention policies.
- [ ] Data retention / TTL for logs.
- [ ] Third-party SIEM or Sentry integration.
- [ ] Key rotation / expiration schedules.
