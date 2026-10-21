const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);
// Report types and pure UI state are shared with the API outside this Expo project root.
config.watchFolders = [...(config.watchFolders || []), path.resolve(__dirname, '../shared')];

module.exports = withNativeWind(config, { input: './src/global.css' });
