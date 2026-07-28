import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // 1. Content Security Policy
          // Prevents XSS attacks
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://api.open-meteo.com wss://*.supabase.co",
              "frame-src 'self' https://maps.google.com https://www.google.com",
              "media-src 'self' blob:",
              "worker-src 'self' blob:",
            ].join("; "),
          },

          // 2. X-Frame-Options
          // Prevents clickjacking attacks
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },

          // 3. X-Content-Type-Options
          // Prevents MIME sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },

          // 4. Referrer Policy
          // Controls referrer information
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },

          // 5. Permissions Policy
          // Controls browser features/APIs
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=(self)",
              "geolocation=(self)",
              "payment=()",
              "usb=()",
              "magnetometer=()",
              "gyroscope=()",
              "accelerometer=()",
            ].join(", "),
          },

          // 6. X-XSS-Protection
          // Extra XSS protection for older browsers
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },

          // 7. Strict-Transport-Security (HSTS)
          // Forces HTTPS connections
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },

          // 8. X-DNS-Prefetch-Control
          // Controls DNS prefetching
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
