import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  webpack: (config) => {
    // Enable symlink resolution
    config.resolve = config.resolve || {};
    config.resolve.symlinks = true;
    
    // Enable WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    
    return config;
  },
};

export default nextConfig;

