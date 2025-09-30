/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['localhost', 'demandgen-pro-api.lindy.site'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://demandgen-pro-api.lindy.site',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://demandgen-pro-api.lindy.site'}/api/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
