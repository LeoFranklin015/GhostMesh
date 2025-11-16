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
    
    // Exclude native modules from webpack bundling (server-side only)
    if (isServer) {
      config.externals = config.externals || [];
      // Prevent webpack from bundling node-dht-sensor
      config.externals.push({
        'node-dht-sensor': 'commonjs node-dht-sensor',
      });
    }
    
    return config;
  },
  
  // Increase build timeout for slower hardware (Raspberry Pi)
  staticPageGenerationTimeout: 120,
  
  // Server-only modules
  serverComponentsExternalPackages: ['node-dht-sensor'],
};

export default nextConfig;
