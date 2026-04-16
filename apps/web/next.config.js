/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@csyfinproj/shared"],
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/.git/**", "**/.next/**"],
      };
    }
    return config;
  },
};

module.exports = nextConfig;
