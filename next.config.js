/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/q5play/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
