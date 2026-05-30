/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ['mongoose', 'mongodb'],
    serverActions: {
      bodySizeLimit: '22mb',
    },
  },
};

module.exports = nextConfig;
