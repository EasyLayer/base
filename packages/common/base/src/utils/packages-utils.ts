import { join, basename, dirname } from 'node:path';
import fs from 'fs-extra';
import semver from 'semver';
import { PackageInfo, PackageJson } from './utils.interfaces';

const isDirectory = async (source: string) => (await fs.lstat(source)).isDirectory();

export const getDirectories = async (source: string): Promise<string[]> => {
  try {
    const dirs = await fs.readdir(source);
    return Promise.all(
      dirs.map(async (name) => {
        const dirPath = join(source, name);
        if (await isDirectory(dirPath)) {
          return dirPath;
        }
        return null;
      })
    ).then((results) => results.filter(Boolean) as string[]);
  } catch (error) {
    console.error(`Error reading directory ${source}:`, error);
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
        if (semver.satisfies(versionStr, knownVulnerablePackages[pkg])) {
          console.warn(`Vulnerable package detected: ${pkg}@${version}`);
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
        const pluginExists = await fs.pathExists(pluginIndexFilePath);

        // If not, then check in the "dist" folder
        const pluginDistExists = !pluginExists ? await fs.pathExists(pluginDistIndexFilePath) : false;
        const packageJsonExists = await fs.pathExists(packageJsonPath);

        if ((pluginExists || pluginDistExists) && packageJsonExists) {
          const packageJson = await fs.readJson(packageJsonPath);
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
