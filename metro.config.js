// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configure resolver to handle @ alias
const projectRoot = __dirname;
config.resolver = {
  ...config.resolver,
  alias: {
    '@': projectRoot,
  },
  extraNodeModules: {
    '@': projectRoot,
  },
  sourceExts: [...(config.resolver?.sourceExts || []), 'ts', 'tsx'],
};

module.exports = config;

