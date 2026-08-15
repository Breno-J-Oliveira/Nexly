/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@nexly/shared'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
