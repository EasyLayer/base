import execa from 'execa';
import { trackUsage, captureStderr } from './scripts';
import { createApp } from './create';
import { Scope } from './interfaces';

export const createQuickStartApp = async (scope: Scope) => {
  console.log('Creating a quickstart app.');
  await trackUsage('didChooseQuickstart', scope);

  await createApp(scope);

  if (scope.noRun === true) return;

  console.log(`Running your application.`);

  try {
    await trackUsage('willStartApp', scope);

    await execa('yarnpkg', ['start:dev'], {
      stdio: 'inherit',
      cwd: scope.rootPath,
      env: {
        FORCE_COLOR: '1',
      },
    });
  } catch (error) {
    if (typeof error === 'string' || error instanceof Error) {
      await captureStderr('didNotStartApp', error);
    }
    process.exit(1);
  }
};
