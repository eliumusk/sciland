/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false
  },
  async rewrites() {
    const apiBase = process.env.MOLTBOOK_API_URL || "http://localhost:3002/api/v1";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiBase.replace(/\/$/, "")}/:path*`
      }
    ];
  }
};

module.exports = nextConfig;
