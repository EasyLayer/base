import { resolve, join } from 'node:path';
import { writeFileSync, readFileSync, ensureDirSync } from 'fs-extra';
import commander from 'commander';
import { NestFactory } from '@nestjs/core';
import { DynamicModule } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { CoreModule } from '../core.module';
import { getDirectories, importAndInitializePlugin } from '../utils';
import { CommandOptions } from './interface';

const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));

const importAllPlugins = async (): Promise<DynamicModule[]> => {
  const pluginsPath = resolve(__dirname, '../../../../plugins');

  const directories = await getDirectories(pluginsPath);

  const pluginInfos = directories.map((dir) => {
    return { path: join(dir, 'dist/index.js') };
  });

  const pluginModules = await Promise.all(pluginInfos.map((pluginInfo) => importAndInitializePlugin(pluginInfo)));

  return pluginModules;
};

const generateDocs = async (outputPath: string, programArgs: CommandOptions) => {
  const { title, description } = programArgs;

  const plugins = await importAllPlugins();

  const rootModule = CoreModule.forRoot({
    appName: 'test app',
    plugins,
  });

  // Create a Nest application
  const app = await NestFactory.create(rootModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle(title)
    .setDescription(description)
    .setVersion(packageJson?.version)
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const docsPath = resolve(outputPath, 'api-docs', 'swagger-spec.json');

  // Make sure the directory exists, otherwise create it
  ensureDirSync(resolve(outputPath, 'api-docs'));

  // Write documentation file
  writeFileSync(docsPath, JSON.stringify(document, null, 2));
  console.log(`Documentation generated at ${docsPath}!`);
  process.exit(0);
};

const command = new commander.Command(packageJson.name);

command
  .version(packageJson.version)
  .argument('[outputPath]', 'Output path for generated documentation', '.')
  .description('generate swagger docs files for all apis')
  .option('--title', '', 'Default Title')
  .option('--description', '', 'Default Description')
  .action((directory, programArgs) => {
    generateDocs(directory, programArgs);
  })
  .parse(process.argv);
