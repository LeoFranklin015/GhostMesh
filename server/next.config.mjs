import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  webpack: (config) => {
    // Add resolve alias for symlinked packages
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      'xxdk-wasm': path.resolve(__dirname, '../xxNetworkdemo/reactjs/node_modules/xxdk-wasm'),
    };
    
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

