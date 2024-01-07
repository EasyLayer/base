import { resolve } from 'node:path';
import { writeJson } from 'fs-extra';
import { findPackagesByPattern, PackageInfo } from '../utils';

interface PluginList {
  [key: string]: {
    name: string;
    version: string;
  };
}

const updatePluginLists = async (): Promise<void> => {
  const pluginsPath = resolve(__dirname, '../../../../plugins');
  const outputFilePath = resolve(__dirname, '../../plugins-list.json');

  // Plugin folders must start with "plugin-"
  const namePattern = /^plugin-/;

  const packages: PackageInfo[] = await findPackagesByPattern(pluginsPath, namePattern);
  const pluginsList: PluginList = {};

  for (const pkg of packages) {
    if (pkg.packageJson.name) {
      pluginsList[pkg.packageJson.name] = {
        name: pkg.packageJson.name,
        version: pkg.packageJson.version,
      };
    }
  }

  await writeJson(outputFilePath, pluginsList, { spaces: 2 });
};

updatePluginLists().catch(console.error);
