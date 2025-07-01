/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async redirects() {
    return [
      // Add any custom redirects here if needed
    ]
  },
  poweredByHeader: false,
}

module.exports = nextConfig