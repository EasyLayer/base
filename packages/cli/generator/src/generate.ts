import { resolve, basename } from 'node:path';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import readline from 'node:readline';
import * as sentry from '@sentry/node';
import { v4 as uuidv4 } from 'uuid';

import { checkRequirements, captureException } from './scripts';
import { setup } from './setup';
import { Scope, GeneraeOptions } from './interfaces';

const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'));

export const generate = (projectDirectory: string, options: Partial<GeneraeOptions>) => {
  sentry.init({
    dsn: options.sentryDsn,
  });

  checkRequirements();

  const rootPath = resolve(projectDirectory);

  const scope: Scope = {
    name: basename(rootPath),
    uuid: uuidv4(),
    rootPath,
    // disable run app after creation
    noRun: options.noRun !== false,
    // use package version as appVersion;
    appVersion: packageJson.version,
    debug: options.debug !== undefined,
    easyLayerDependencies: options.easyLayerDependencies || [],
  };

  sentry.configureScope(function configureScope(sentryScope) {
    const tags = {
      os: os.type(),
      osPlatform: os.platform(),
      osArch: os.arch(),
      osRelease: os.release(),
      version: scope.appVersion,
      nodeVersion: process.versions.node,
    };

    (Object.keys(tags) as Array<keyof typeof tags>).forEach((tag) => {
      sentryScope.setTag(tag, tags[tag]);
    });
  });

  initCancelCatcher();

  return setup(scope).catch((error) => {
    console.error(error);
    return captureException(error).then(() => {
      process.exit(1);
    });
  });
};

const initCancelCatcher = () => {
  // Create interface for windows user to let them quit the program.
  if (process.platform === 'win32') {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on('SIGINT', function sigint() {
      process.emit('SIGINT');
    });
  }

  process.on('SIGINT', () => {
    process.exit(1);
  });
};
