import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix workspace root detection when multiple lockfiles exist
  outputFileTracingRoot: path.join(__dirname),

  // Default Next.js output — works with @netlify/plugin-nextjs

  typescript: {
    ignoreBuildErrors: true,
  },

  // Optimize images
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '*.supabase.co',
        },
        {
          protocol: 'https',
          hostname: 'lh3.googleusercontent.com',
        },
        {
          protocol: 'https',
          hostname: 'levitatelabs.online',
        },
        {
          protocol: 'https',
          hostname: '*.netlify.app',
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

  // Force API routes to be dynamic (not pre-rendered at build time)
  // This prevents missing env vars from breaking builds
  serverExternalPackages: ['nodemailer', 'imap-simple', 'mailparser'],
};

export default nextConfig;
