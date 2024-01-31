import path from 'node:path';
import { findPackagesByPattern } from './packages-utils';
import { PluginInfo } from './utils.interfaces';

export const resolveCustomPluginsPath = (basePath: string): string => {
  return path.resolve(basePath, 'plugins');
};

// Return path to plugin folders
export const findCustomPlugins = async (customPluginsPath: string): Promise<PluginInfo[]> => {
  const packages = await findPackagesByPattern(customPluginsPath, /^plugin-/);
  return packages.map((pkg) => ({ path: pkg.path, name: pkg.packageJson.name, version: pkg.packageJson.version }));
};
