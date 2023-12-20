import chalk from 'chalk';
import fse from 'fs-extra';
import { stopProcess } from './stop-process';

// Checks if the an empty directory exists at rootPath
export const checkInstallPath = async (rootPath: string) => {
  if (await fse.pathExists(rootPath)) {
    const stat = await fse.stat(rootPath);

    if (!stat.isDirectory()) {
      stopProcess(
        `⛔️ ${chalk.green(rootPath)} is not a directory. Make sure to create the application in an empty directory.`
      );
    }

    const files = await fse.readdir(rootPath);
    if (files.length > 1) {
      stopProcess(
        `⛔️ You can only create the app in an empty directory.\nMake sure ${chalk.green(rootPath)} is empty.`
      );
    }
  }
};
