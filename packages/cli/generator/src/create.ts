import { join } from 'node:path';
import fse from 'fs-extra';
import chalk from 'chalk';
import execa from 'execa';
import ora from 'ora';
import _ from 'lodash';
import { stopProcess, trackUsage, captureStderr, checkResourcesPath } from './scripts';
import { Scope } from './interfaces';
import { isStderrError } from './errors';
import { packageJSON } from './utils/package.json';

// TODO: split this large function into smaller and easily testable ones
export const createApp = async (scope: Scope) => {
  console.log(`Creating the new application at ${chalk.green(scope.rootPath)}.`);
  console.log('Creating files.');

  const { rootPath, resourcesPath } = scope;

  try {
    await checkResourcesPath(resourcesPath);

    // copy folders & files
    await fse.copy(join(resourcesPath, 'folders'), rootPath);

    const copyTypescriptFilesFromSubDirectory = (subDirectory: string) => {
      const files = fse.readdirSync(join(resourcesPath, 'json', subDirectory));

      return Promise.all(
        files.map((file) => {
          const src = join(resourcesPath, 'json', subDirectory, file);
          const dest = join(rootPath, file);
          return fse.copy(src, dest);
        })
      );
    };

    // copy typescript config files
    copyTypescriptFilesFromSubDirectory('typescript');

    const copyCommonFilesWithDot = () => {
      const files = fse.readdirSync(join(resourcesPath, 'common'));

      return Promise.all(
        files.map((file) => {
          const src = join(resourcesPath, 'common', file);
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

  await runCommandWithLogging('yarnpkg', ['install'], scope.rootPath, 'Installing package dependencies...');

  if (scope.easyLayerDependencies.length > 0) {
    await runCommandWithLogging(
      'yarnpkg',
      ['add', ...scope.easyLayerDependencies],
      scope.rootPath,
      'Adding EasyLayer dependencies...'
    );
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
};

const runCommandWithLogging = async (command: string, args: string[], rootPath: string, description: string) => {
  const loader = ora(description).start();

  const process = execa(command, args, {
    cwd: rootPath,
    stdin: 'ignore',
    shell: true,
  });

  process.stdout?.on('data', (data) => (loader.text = `stdout: ${data.toString()}`));
  process.stderr?.on('data', (data) => (loader.text = `stderr: ${data.toString()}`));

  try {
    await process;
    loader.succeed('Command completed successfully');
  } catch (error) {
    const stderr = isStderrError(error) ? error.stderr : '';

    loader.fail('Command failed');

    console.error(`${chalk.red('Error')} while installing dependencies:`);
    console.error(stderr);

    await captureStderr('didNotInstallAppDependencies', error);

    stopProcess();

    await fse.remove(rootPath);

    // Resend the error for further processing
    throw error;
  } finally {
    loader.stop();
  }
};

// Function to create .env and .env.example files
// based on the .env.example files found in @easylayer packages
const createEnvFiles = async ({ rootPath }: Scope) => {
  // TODO: the prefix of the names of the packages
  // must be taken with a variable "easyLayerDependencies"
  const easyLayerDir = join(rootPath, 'node_modules', '@easylayer');
  const envVariables = new Set();

  // Check if the @easylayer directory exists
  if (await fse.pathExists(easyLayerDir)) {
    const packages = await fse.readdir(easyLayerDir);

    // Loop through each package in the @easylayer directory
    for (const pkg of packages) {
      const envExamplePath = join(easyLayerDir, pkg, '.env.example');

      // Check if the .env.example file exists
      if (await fse.pathExists(envExamplePath)) {
        const content = await fse.readFile(envExamplePath, 'utf8');

        content.split('\n').forEach((line) => {
          // If the line is not empty and not a comment, add it to the envVariables set
          // if (line && !line.startsWith('#')) {
          //   envVariables.add(line.split('=')[0] + '=');
          // }
          if (line && !line.startsWith('#')) {
            const parts = line.split('=');
            if (parts.length === 2) {
              const name = parts[0];
              const value = parts[1];
              envVariables.add(`${name}=${value}`);
            }
          }
        });
      }
    }
  }

  // Convert the set of environment variables to a string
  const envContent = Array.from(envVariables).join('\n');

  await fse.writeFile(join(rootPath, '.env'), envContent);
  await fse.writeFile(join(rootPath, '.env.example'), envContent);
};
