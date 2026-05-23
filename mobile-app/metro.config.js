const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
const mobileNodeModules = path.resolve(projectRoot, 'node_modules');
const workspaceNodeModules = path.resolve(workspaceRoot, 'node_modules');

const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    disableHierarchicalLookup: true,
    extraNodeModules: {
      react: path.resolve(mobileNodeModules, 'react'),
      'react-native': path.resolve(mobileNodeModules, 'react-native'),
    },
    nodeModulesPaths: [mobileNodeModules, workspaceNodeModules],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
