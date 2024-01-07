import path from 'node:path';
import { findPackagesByPattern } from './packages-utils';
import { PluginInfo } from './utils.interfaces';

export const resolveNodeModulesPath = (basePath: string): string => {
  return path.resolve(basePath, 'node_modules');
};

// Return path to index.js
export const findEasylayerPlugins = async (nodeModulesPath: string): Promise<PluginInfo[]> => {
  const packages = await findPackagesByPattern(nodeModulesPath, /^@easylayer\/plugin-/);
  return packages.map((pkg) => ({ path: pkg.path, name: pkg.packageJson.name }));
};
