const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // Required for Firebase Hosting static export
  images: {
    unoptimized: true,
  },
  trailingSlash: true,

  compiler: {
    // Remove console.log in production for smaller bundle
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'], // Keep console.error and console.warn
    } : false,
  },

  // Compression
  compress: true,

  // Optimize production builds
  productionBrowserSourceMaps: false, // Disable source maps in production for smaller bundles

  // Optimize webpack for faster builds
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Use file system events instead of polling (faster)
      config.watchOptions = {
        poll: false, // Disable polling - use native file watching
        aggregateTimeout: 300,
        ignored: ['**/node_modules', '**/.next', '**/out'],
      }

      // Fix for hard refresh issues - ensure consistent file serving
      config.resolve = {
        ...config.resolve,
        symlinks: false, // Don't follow symlinks (faster)
      }
    }

    // Optimize bundle size
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
      }
    }

    return config
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'recharts',
      'framer-motion',
      'firebase/firestore',
      'firebase/auth',
      'firebase/messaging',
      'firebase/functions',
      'firebase/storage',
      'firebase/analytics',
    ],
  },
}

module.exports = withNextIntl(nextConfig);


// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(module.exports, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "pocket-4m",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
