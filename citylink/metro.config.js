const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 🚀 OPTIMIZATION: Reduce file descriptors (EMFILE fix)
// We exclude all non-source folders and large volatile directories from the watcher
config.resolver.blockList = [
  /node_modules\/.*\/android\/.*\/build\/.*/,
  /node_modules\/.*\/android\/.*\/classes\/.*/,
  /node_modules\/.*\/android\/.*\/kotlin\/.*/,
  /node_modules\/@jest\/.*/,
  /\.expo\/.*/,
  /android\/.*/,      // Exclude native android folder
  /docs\/.*/,         // Exclude documentation
  /artifacts\/.*/,    // Exclude artifacts
  /scratch\/.*/,      // Exclude scratch scripts
  /dist\/.*/,         // Exclude build outputs
  /supabase\/.*/,     // Exclude supabase config
];

// 🏎️ PERFORMANCE: Cap workers to avoid descriptor exhaustion on Windows
config.maxWorkers = 2;

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-dom': path.resolve(__dirname, 'src/utils/shims/react-dom.js'),
};

module.exports = config;
