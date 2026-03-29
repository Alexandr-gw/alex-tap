const path = require('path');
const Module = require('module');

const serverRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(serverRoot, '..', '..');
const serverNodeModules = path.join(serverRoot, 'node_modules');
const rootNodeModules = path.join(workspaceRoot, 'node_modules');

process.env.NODE_PATH = [serverNodeModules, rootNodeModules, process.env.NODE_PATH]
  .filter(Boolean)
  .join(path.delimiter);

Module._initPaths();

const jestBin = require.resolve('jest/bin/jest', {
  paths: [serverNodeModules, rootNodeModules],
});

process.argv = ['node', jestBin, ...process.argv.slice(2)];
require(jestBin);
