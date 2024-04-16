import { resolve, dirname, join } from 'node:path';
import { pathExists } from 'fs-extra';
import { findPackagesByPattern } from './packages-utils';
import { PluginInfo } from './utils.interfaces';

export const resolveNodeModulesPath = (basePath: string): string => {
  return resolve(basePath, 'node_modules');
};

// Return path to plugin folders
export const findEasylayerPlugins = async (initialNodeModulesPath: string): Promise<PluginInfo[]> => {
  let nodeModulesPath = initialNodeModulesPath;

  // Check for node_modules by going up the directory tree
  while (!(await pathExists(nodeModulesPath)) && dirname(nodeModulesPath) !== nodeModulesPath) {
    // Move one level higher in the directory tree
    nodeModulesPath = resolve(nodeModulesPath, '..', '..', 'node_modules');
  }

  // If node_modules is still not found, exit the function
  if (!(await pathExists(nodeModulesPath))) {
    console.log('node_modules not found');
    return [];
  }

  // Append the @easylayer directory path to the nodeModulesPath
  const easylayerPath = join(nodeModulesPath, '@easylayer');

  // Check if the @easylayer directory exists
  if (!(await pathExists(easylayerPath))) {
    console.log('@easylayer directory not found');
    return [];
  }

  const packages = await findPackagesByPattern(easylayerPath, /^plugin-/);
  return packages.map((pkg) => ({ path: pkg.path, name: pkg.packageJson.name, version: pkg.packageJson.version }));
};
