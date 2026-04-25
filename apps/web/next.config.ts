import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@condofortis/types', '@condofortis/ui'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
}

export default nextConfig
