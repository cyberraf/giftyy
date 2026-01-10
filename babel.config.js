const path = require('path');

module.exports = function (api) {
  api.cache(false); // Disable cache to ensure fresh resolution during builds
  const projectRoot = __dirname;
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: [projectRoot],
          alias: {
            '@': projectRoot,
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      ],
      // Reanimated plugin must be listed last
      'react-native-reanimated/plugin',
    ],
  };
};
