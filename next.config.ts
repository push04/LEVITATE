import type { NextConfig } from "next";

// Trigger reload for env var update

const nextConfig: NextConfig = {
  // Output as serverless for Netlify
  output: 'standalone',

  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
    unoptimized: false,
  },

  // Compress responses
  compress: true,

  // Production source maps (optional, disable for smaller builds)
  productionBrowserSourceMaps: false,

  // Strict mode for better error catching
  reactStrictMode: true,

  // Experimental features for better performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;
