import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import commander from 'commander';
import { checkInstallPath, generate, GeneraeOptions } from '@easylayer/generator';
import { promptUser } from './utils/prompt-user';
import { parsePlugins, validatePlugins } from './utils/plugins';
import { dependencies } from './utils/dependencies';
import { CommandOptions } from './interfaces';

const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'));

const create = async (appName: string, programArgs: CommandOptions) => {
  if (appName) {
    await checkInstallPath(resolve(appName));
  }

  const { plugins, ...restProgramArgs } = programArgs;

  if (plugins) {
    validatePlugins(plugins);
  }

  const hasPlugins = !!programArgs.plugins;

  const prompt = await promptUser(appName, programArgs, hasPlugins);
  const directory = prompt.directory || appName;
  await checkInstallPath(resolve(directory));

  const easyLayerDependencies = [...dependencies, ...(plugins || prompt.plugins)];

  // Setup Sentry.io url
  const sentryDsn = 'https://a6167fb1304fcbce44884f9213cb9abe@o4506386985648128.ingest.sentry.io/4506386992136192';

  const generateAppOptions: GeneraeOptions = {
    ...restProgramArgs,
    easyLayerDependencies,
    sentryDsn,
  };

  return generateApp(directory, generateAppOptions);
};

const generateApp = (projectName: string, options: GeneraeOptions) => {
  return generate(projectName, options).then(() => {
    if (process.platform === 'win32') {
      process.exit(0);
    }
  });
};

const command = new commander.Command(packageJson.name);

command
  .version(packageJson.version)
  .arguments('[directory]')
  .option('--no-run', 'Do not start the application after it is created')
  .option('--debug', 'Display debug logs')
  .option('--quickstart', 'Quickstart installation type app creation')
  .option('--plugins <plugins>', 'Specify plugins to install', parsePlugins)
  .description('create a new application')
  .action((directory, programArgs) => {
    create(directory, programArgs);
  })
  .parse(process.argv);
