/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.clerk.com',
      },
      {
        protocol: 'https',
        hostname: '**.clerk.dev',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // Experimental features
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Enable WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
    };

    // Add WASM file loader
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Add WebWorker support for WASM workers
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      use: {
        loader: 'worker-loader',
        options: {
          name: 'static/[hash].worker.js',
          publicPath: '/_next/',
        },
      },
    });

    return config;
  },
  
  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      },
      // Cache optimization for public API
      {
        source: '/api/public/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600'
          }
        ]
      },
      // Cache optimization for static assets
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      // 🚀 SSR Smart Caching - Dashboard
      {
        source: '/dashboard-ssr',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300'
          },
          {
            key: 'CDN-Cache-Control', 
            value: 'public, s-maxage=60'
          },
          {
            key: 'Vercel-CDN-Cache-Control',
            value: 'public, s-maxage=60'
          }
        ]
      },
      // 🚀 SSR Smart Caching - Analytics (cache más largo)
      {
        source: '/analytics-ssr',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=900'
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, s-maxage=300'
          }
        ]
      },
      // 🚀 SSR Smart Caching - Stats (cache aún más largo)
      {
        source: '/stats-ssr',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=600, stale-while-revalidate=1800'
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, s-maxage=600'
          }
        ]
      },
      // 🚀 SSR API endpoints caching
      {
        source: '/api/ssr/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300'
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, s-maxage=60'
          }
        ]
      },
      // 🚀 API Route Caching - Products API (estático, cache largo)
      {
        source: '/api/products',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=900'
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, s-maxage=300'
          },
          {
            key: 'Vary',
            value: 'Authorization'
          }
        ]
      },
      // 🚀 API Route Caching - Orders API (dinámico, cache corto)
      {
        source: '/api/sellers/:id/orders',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=30, stale-while-revalidate=120'
          },
          {
            key: 'Vary',
            value: 'Authorization'
          }
        ]
      },
      // 🚀 API Route Caching - Clients API (semi-dinámico)
      {
        source: '/api/sellers/:id/clients',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, max-age=60, stale-while-revalidate=300'
          },
          {
            key: 'Vary',
            value: 'Authorization'
          }
        ]
      },
      // 🚀 API Route Caching - Public APIs (máximo cache)
      {
        source: '/api/public/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=1800, stale-while-revalidate=3600'
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, s-maxage=1800'
          }
        ]
      }
    ];
  },
};

// Sentry configuration
module.exports = withSentryConfig(
  nextConfig,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Transpiles SDK to be compatible with IE11 (increases bundle size)
    transpileClientSDK: true,

    // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
    tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,
  }
);
