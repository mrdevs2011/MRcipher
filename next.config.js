/** @type {import('next').NextConfig} */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mrcipher.vercel.app';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_APP_URL: APP_URL,
  },

  async headers() {
    const apiSecurityHeaders = [
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-XSS-Protection',
        value: '0',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value:
          'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
      },
    ];

    const staticSecurityHeaders = [
      ...apiSecurityHeaders,
      {
        key: 'Content-Security-Policy',
        value:
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://*.googleapis.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.googleapis.com https://apis.google.com https://*.firebaseio.com https://*.google-analytics.com; frame-src 'self' https://*.firebaseapp.com https://*.google.com https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",


      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin-allow-popups',
      },
    ];

    return [
      {
        source: '/api/v1/:path*',
        headers: apiSecurityHeaders,
      },
      {
        source: '/test-client/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Content-Security-Policy',
            value:
              `default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://*.googleapis.com https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.googleapis.com https://apis.google.com https://*.firebaseio.com https://*.google-analytics.com ${APP_URL} http://localhost:3000; frame-src 'self' https://*.firebaseapp.com https://*.google.com https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`,
          },
        ],
      },
      {
        source: '/:path*',
        headers: staticSecurityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
