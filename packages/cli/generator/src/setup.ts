import { trackUsage } from './scripts/usage';
import { checkInstallPath } from './scripts';
import { createQuickStartApp } from './create-quickstart-app';
import { Scope } from './interfaces';

export const setup = async (scope: Scope) => {
  // check rootPath is empty
  checkInstallPath(scope.rootPath);

  await trackUsage('willCreateApp', scope);

  return createQuickStartApp(scope);

  // We can add any other modes (with db)
};
