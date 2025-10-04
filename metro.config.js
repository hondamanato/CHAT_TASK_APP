const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Reset cache for production builds
config.resetCache = true;

// Ensure source maps are enabled for better debugging
config.resolver.sourceExts = [...config.resolver.sourceExts];

module.exports = config;