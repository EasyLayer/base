import path from 'node:path';
import fse from 'fs-extra';
import { stopProcess } from './stop-process';

export const checkResourcesPath = async (resourcesPath: string): Promise<void> => {
  if (!(await fse.pathExists(resourcesPath))) {
    stopProcess(`⛔️ The resources folder ${resourcesPath} does not exist.`);
  }

  const requiredFolders = ['common', 'folders', 'json'];
  for (const folder of requiredFolders) {
    const folderPath = path.join(resourcesPath, folder);
    if (!(await fse.pathExists(folderPath))) {
      stopProcess(`⛔️ A required folder '${folder}' is missing in ${resourcesPath}.`);
    }
  }
};
