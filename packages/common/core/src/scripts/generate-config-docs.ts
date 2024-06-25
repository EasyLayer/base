/* 
  documentation tags: 13d1e363-7d07-4aa0-9fcc-0b30b9fba98a
*/
import { resolve } from 'node:path';
import { writeFileSync, readFileSync, ensureDirSync } from 'fs-extra';
import commander from 'commander';
import { targetConstructorToSchema } from 'class-validator-jsonschema';
import { findCustomPlugins } from '../utils';
import * as currentConfigs from '../config';

type ConfigConstructor = new (...args: any[]) => any;

const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));

const createSafeName = (name: string) => {
  return name.replace('@easylayer/', '');
};

const generateSchemaForConfig = (ConfigClass: ConfigConstructor, outputPath: string, name: string) => {
  const schema = targetConstructorToSchema(ConfigClass);

  if (!schema) {
    console.log(`No schema found for ${ConfigClass.name}, skipping.`);
    return;
  }

  const safeName = createSafeName(name);
  const schemaPath = resolve(outputPath, 'config-docs', `${safeName}_${ConfigClass.name}.json`);
  ensureDirSync(resolve(outputPath, 'config-docs'));
  writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
  console.log(`Documentation generated for ${safeName} at ${schemaPath}`);
};

const generateConfigDocs = async (outputPath: string) => {
  // Generating documentation for the base configs
  Object.values(currentConfigs)
    .filter((value) => value instanceof Function)
    .forEach((ConfigClass) => {
      generateSchemaForConfig(ConfigClass as ConfigConstructor, outputPath, 'base');
    });

  // Plugin Search
  const customPluginsPath = resolve(__dirname, '../../../../plugins');
  const plugins = await findCustomPlugins(customPluginsPath);

  for (const plugin of plugins) {
    const configFilePath = resolve(plugin.path, 'config', 'index.js');
    const configFiles = await import(configFilePath);

    Object.values(configFiles).forEach((ConfigClass) => {
      if (ConfigClass instanceof Function) {
        generateSchemaForConfig(ConfigClass as ConfigConstructor, outputPath, plugin.name);
      }
    });
  }
};

const command = new commander.Command(packageJson.name);

command
  .version(packageJson.version)
  .argument('[outputPath]', 'Output path for generated documentation', '.')
  .description('Generate JSON documentation files for all configs')
  .action((directory) => {
    generateConfigDocs(directory);
  })
  .parse(process.argv);
