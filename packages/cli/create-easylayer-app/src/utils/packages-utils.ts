import path from 'node:path';
import fs from 'fs-extra';

export interface PackageJson {
  name: string;
  version: string;
  [key: string]: any;
}

export interface PackageInfo {
  path: string;
  packageJson: PackageJson;
}

const isDirectory = async (source: string) => (await fs.lstat(source)).isDirectory();

export const getDirectories = async (source: string): Promise<string[]> => {
  try {
    const dirs = await fs.readdir(source);
    return Promise.all(
      dirs.map(async (name) => {
        const dirPath = path.join(source, name);
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

export const findPackagesByPattern = async (basePath: string, namePattern: RegExp): Promise<PackageInfo[]> => {
  const packages: PackageInfo[] = [];

  const pluginDirs = await getDirectories(basePath);
  for (const dir of pluginDirs) {
    if (namePattern.test(path.basename(dir))) {
      try {
        const pluginIndexFilePath = path.join(dir, 'index.js');
        const pluginDistIndexFilePath = path.join(dir, 'dist', 'index.js');
        const packageJsonPath = path.join(dir, 'package.json');

        // Checking if "index.js" exists in the plugin root
        const pluginExists = await fs.pathExists(pluginIndexFilePath);

        // If not, then check in the "dist" folder
        const pluginDistExists = !pluginExists ? await fs.pathExists(pluginDistIndexFilePath) : false;
        const packageJsonExists = await fs.pathExists(packageJsonPath);

        if ((pluginExists || pluginDistExists) && packageJsonExists) {
          const packageJson = await fs.readJson(packageJsonPath);
          if (isValidPackageJson(packageJson)) {
            const pluginPath = pluginExists ? pluginIndexFilePath : pluginDistIndexFilePath;
            packages.push({ path: pluginPath, packageJson });
          }
        } else {
          console.log(`Folder ${dir} does not contain required files.`);
        }
      } catch (error) {
        console.error(`Error processing folder ${dir}:`, error);
      }
    }
  }

  return packages;
};
