// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination:
          "https://4wqwppx8z6.execute-api.us-east-1.amazonaws.com/dev/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
