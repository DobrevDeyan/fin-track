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
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'recharts', 'firebase/firestore', 'firebase/auth'],
  },
}

module.exports = nextConfig

