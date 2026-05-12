const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add blocklist to prevent ENOENT errors on internal build/cache folders in node_modules
// We target specific volatile android build folders rather than all 'build' folders
config.resolver.blockList = [
  /node_modules\/.*\/android\/.*\/build\/.*/,
  /node_modules\/.*\/android\/.*\/classes\/.*/,
  /node_modules\/.*\/android\/.*\/kotlin\/.*/,
  /node_modules\/@jest\/.*/,
  /\.expo\/.*/,
];

const path = require('path');

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-dom': path.resolve(__dirname, 'src/utils/shims/react-dom.js'),
};

module.exports = config;
