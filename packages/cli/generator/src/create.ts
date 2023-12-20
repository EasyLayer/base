import { join } from 'node:path';
import fse from 'fs-extra';
import chalk from 'chalk';
import execa from 'execa';
import ora from 'ora';
import _ from 'lodash';
import { stopProcess, trackUsage, captureStderr } from './scripts';
import { Scope } from './interfaces';
import { isStderrError } from './errors';
import { packageJSON } from './utils/package.json';

export default async (scope: Scope) => {
  console.log(`Creating the new application at ${chalk.green(scope.rootPath)}.`);
  console.log('Creating files.');

  const { rootPath } = scope;
  const resources = join(__dirname, '../resources');

  try {
    // copy folders & files
    await fse.copy(join(resources, 'folders'), rootPath);

    const copyTypescriptFilesFromSubDirectory = (subDirectory: string) => {
      const files = fse.readdirSync(join(resources, 'json', subDirectory));

      return Promise.all(
        files.map((file) => {
          const src = join(resources, 'json', subDirectory, file);
          const dest = join(rootPath, file);
          return fse.copy(src, dest);
        })
      );
    };

    // copy typescript config files
    copyTypescriptFilesFromSubDirectory('typescript');

    const copyCommonFilesWithDot = () => {
      const files = fse.readdirSync(join(resources, 'common'));

      return Promise.all(
        files.map((file) => {
          const src = join(resources, 'common', file);
          // Add dot
          const dest = join(rootPath, `.${file}`);
          return fse.copy(src, dest);
        })
      );
    };

    // сopy common dot files
    copyCommonFilesWithDot();

    await trackUsage('didCopyAppFiles', scope);

    // create package.json
    await fse.writeJSON(
      join(rootPath, 'package.json'),
      packageJSON({
        packageName: _.kebabCase(scope.name),
        uuid: scope.uuid,
      }),
      {
        spaces: 2,
      }
    );

    await trackUsage('didWritePackageJSON', scope);

    // create node_modules if it doesn't exist
    await fse.ensureDir(join(rootPath, 'node_modules'));
  } catch (error) {
    await fse.remove(scope.rootPath);
    throw error;
  }

  await trackUsage('willInstallAppDependencies', scope);

  const installPrefix = chalk.yellow('Installing dependencies:');
  const loader = ora(installPrefix).start();

  const logInstall = (chunk = '') => {
    loader.text = `${installPrefix} ${chunk.toString().split('\n').join(' ')}`;
  };

  try {
    // Install dependencies in package.json file
    const installingRunner = installPackageDependencies(scope);
    installingRunner.stdout?.on('data', logInstall);
    installingRunner.stderr?.on('data', logInstall);
    await installingRunner;

    if (scope.easyLayerDependencies.length > 0) {
      // Add easylayer dependencies (current versions)
      const addingRunner = addEasyLayerDependencies(scope);
      addingRunner.stdout?.on('data', logInstall);
      addingRunner.stderr?.on('data', logInstall);
      await addingRunner;
    }

    loader.stop();
    console.log(`Dependencies installed ${chalk.green('successfully')}.`);

    await trackUsage('didInstallAppDependencies', scope);
  } catch (error) {
    console.debug(error);
    const stderr = isStderrError(error) ? error.stderr : '';

    loader.stop();

    console.error(`${chalk.red('Error')} while installing dependencies:`);
    console.error(stderr);

    await captureStderr('didNotInstallAppDependencies', error);

    stopProcess();

    await fse.remove(scope.rootPath);
    throw error;
  }

  await trackUsage('willCreateEnvFiles', scope);

  try {
    // create envs files
    await createEnvFiles(scope);

    await trackUsage('didCreateEnvsFiles', scope);
  } catch (error) {
    console.debug(error);
    const stderr = isStderrError(error) ? error.stderr : '';

    console.error(`${chalk.red('Error')} while creating envs files:`);
    console.error(stderr);

    await captureStderr('didNotCreateEnvsFiles', error);

    await fse.remove(scope.rootPath);
    throw error;
  }

  await trackUsage('didCreateApp', scope);

  console.log(`Your application was created at ${chalk.green(rootPath)}.\n`);

  const cmd = chalk.cyan('yarn');

  console.log('Available commands in your project:');
  console.log();
  console.log(`  ${cmd} start:dev`);
  console.log('  Start the app in development mode.');
  console.log();
  console.log(`  ${cmd} start`);
  console.log('  Start the app');
  console.log();
};

const installPackageDependencies = ({ rootPath }: Scope) => {
  const installArguments = ['install'];

  return execa('yarnpkg', installArguments, {
    cwd: rootPath,
    stdin: 'ignore',
  });
};

const addEasyLayerDependencies = ({ rootPath, easyLayerDependencies }: Scope) => {
  const addingArguments = ['add', ...easyLayerDependencies];

  return execa('yarnpkg', addingArguments, {
    cwd: rootPath,
    stdin: 'ignore',
  });
};

const createEnvFiles = async ({ rootPath }: Scope) => {
  const easyLayerDir = join(rootPath, 'node_modules', '@easylayer');
  const envVariables = new Set();

  const packages = await fse.readdir(easyLayerDir);

  for (const pkg of packages) {
    const envExamplePath = join(easyLayerDir, pkg, 'env.example');
    if (await fse.pathExists(envExamplePath)) {
      const content = await fse.readFile(envExamplePath, 'utf8');
      content.split('\n').forEach((line) => {
        if (line && !line.startsWith('#')) {
          envVariables.add(line.split('=')[0] + '=');
        }
      });
    }
  }

  const envContent = Array.from(envVariables).join('\n');
  await fse.writeFile(join(rootPath, '.env'), envContent);
  await fse.writeFile(join(rootPath, 'env.example'), envContent);
};
