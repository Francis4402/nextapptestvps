import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['http://161.248.189.254'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
        port: '',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '/uploads/**',
      },
    ],
    localPatterns: [
      {
        pathname: "/uploads/**"
      }
    ]
  }
};

export default nextConfig;
