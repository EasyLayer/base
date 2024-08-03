import { join, basename, dirname } from 'node:path';
import { readdir, stat, pathExists, readJson } from 'fs-extra';
import { satisfies } from 'semver';
import { PackageInfo, PackageJson } from './utils.interfaces';

const isDirectory = async (path: string): Promise<boolean> => (await stat(path)).isDirectory();

export const getDirectories = async (path: string): Promise<string[]> => {
  try {
    const dirs = await readdir(path);
    return Promise.all(
      dirs.map(async (name: any) => {
        const dirPath = join(path, name);
        if (await isDirectory(dirPath)) {
          return dirPath;
        }
        return null;
      })
    ).then((results) => results.filter(Boolean) as string[]);
  } catch (error) {
    console.error(`Error reading directory ${path}:`, error);
    return [];
  }
};

const isValidPackageJson = (packageJson: any): packageJson is PackageJson => {
  return packageJson && typeof packageJson.name === 'string' && typeof packageJson.version === 'string';
};

const knownVulnerablePackages: Record<string, string> = {
  'example-package': '>=1.0.0 <2.0.0',
};

// This is an example of where and how we could potentially check the security of plugin packages
export const isPackageJsonSafe = (packageJson: PackageJson): boolean => {
  if (packageJson.dependencies) {
    for (const [pkg, version] of Object.entries(packageJson.dependencies)) {
      if (knownVulnerablePackages.hasOwnProperty(pkg)) {
        const versionStr = String(version);
        if (satisfies(versionStr, knownVulnerablePackages[pkg])) {
          return false;
        }
      }
    }
  }
  return true;
};

export const findPackagesByPattern = async (basePath: string, namePattern: RegExp): Promise<PackageInfo[]> => {
  const packages: PackageInfo[] = [];

  const pluginDirs = await getDirectories(basePath);
  for (const dir of pluginDirs) {
    if (namePattern.test(basename(dir))) {
      try {
        const pluginIndexFilePath = join(dir, 'index.js');
        const pluginDistIndexFilePath = join(dir, 'dist', 'index.js');
        const packageJsonPath = join(dir, 'package.json');

        // Checking if "index.js" exists in the plugin root
        const pluginExists = await pathExists(pluginIndexFilePath);

        // If not, then check in the "dist" folder
        const pluginDistExists = !pluginExists ? await pathExists(pluginDistIndexFilePath) : false;
        const packageJsonExists = await pathExists(packageJsonPath);

        if ((pluginExists || pluginDistExists) && packageJsonExists) {
          const packageJson = await readJson(packageJsonPath);
          if (isValidPackageJson(packageJson)) {
            const pluginFolderPath = pluginExists ? dirname(pluginIndexFilePath) : dirname(pluginDistIndexFilePath);
            packages.push({ path: pluginFolderPath, packageJson });
          }
        } else {
          console.log(`Folder ${dir} does not contain required files.`);
        }
      } catch (error) {
        console.error(`Error processing folder ${dir}:`, error);
      }
    }
  }

  return packages.filter((pkg) => isPackageJsonSafe(pkg.packageJson));
};
