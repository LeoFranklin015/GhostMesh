/** @type {import('next').NextConfig} */
const nextConfig = {
  // Reduce memory usage during build (important for Raspberry Pi)
  swcMinify: true,
  
  // Ensure WASM files are served correctly
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
  
  // Increase build timeout for slower hardware (Raspberry Pi)
  staticPageGenerationTimeout: 120,
};

export default nextConfig;
