/* 
  documentation tags: 9e6d397d-1a38-42fe-869b-447e1e0276b3
*/
import { resolve } from 'node:path';
import { writeFileSync, readFileSync, ensureDirSync } from 'fs-extra';
import commander from 'commander';
import { NestFactory } from '@nestjs/core';
import { DynamicModule } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { CoreModule } from '../core.module';
import { importAndInitializePlugin, findCustomPlugins } from '../utils';

interface GenerateDocOptions {
  title: string;
  name: string;
  version: string;
  outputPath: string;
  module: DynamicModule;
}

const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));

const createSafeName = (name: string) => {
  return name.replace('@easylayer/', '');
};

const generateDoc = async ({ title, name, version, outputPath, module }: GenerateDocOptions) => {
  const app = await NestFactory.create(module, { logger: false });

  const config = new DocumentBuilder()
    .setTitle(title)
    .setDescription('')
    .setVersion(version)
    // .addTag(safeName)
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const safeName = createSafeName(name);

  // Using the updated name for the file path
  const docsPath = resolve(outputPath, 'api-docs', `${safeName}_${version}.json`);

  ensureDirSync(resolve(outputPath, 'api-docs'));
  writeFileSync(docsPath, JSON.stringify(document, null, 2));
  console.log(`Documentation for ${name} generated at ${docsPath}!`);
};

const generateAPIDocs = async (outputPath: string) => {
  const rootModule = CoreModule.forRoot({
    plugins: [],
  });

  // Generating documentation for the base controllers
  await generateDoc({
    title: 'Base',
    name: packageJson.name,
    version: packageJson.version,
    outputPath,
    module: rootModule,
  });

  // Plugin Search
  const customPluginsPath = resolve(__dirname, '../../../../plugins');
  const plugins = await findCustomPlugins(customPluginsPath);

  for (const plugin of plugins) {
    // Importing the one plugin and generating documentation
    const module = await importAndInitializePlugin(plugin);

    await generateDoc({
      title: 'API',
      name: plugin.name,
      version: plugin.version,
      outputPath,
      module,
    });
  }

  process.exit(0);
};

const command = new commander.Command(packageJson.name);

command
  .version(packageJson.version)
  .argument('[outputPath]', 'Output path for generated documentation', '.')
  .description('generate swagger docs files for all apis')
  .action((directory) => {
    generateAPIDocs(directory);
  })
  .parse(process.argv);
