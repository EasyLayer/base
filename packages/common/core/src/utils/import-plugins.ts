import { join } from 'node:path';
import { DynamicModule } from '@nestjs/common';
import { findEasylayerPlugins, resolveNodeModulesPath } from './find-easylayer-plugins';
import { findCustomPlugins, resolveCustomPluginsPath } from './find-custom-plugins';
import { PluginInfo } from './utils.interfaces';

const isDynamicModule = (object: any): object is DynamicModule => {
  return object && typeof object === 'object' && 'module' in object;
};

export const importPlugins = async (basePath: string): Promise<DynamicModule[]> => {
  const nodeModulesPath = resolveNodeModulesPath(basePath);
  const customPluginsPath = resolveCustomPluginsPath(basePath);

  const easylayerPlugins = await findEasylayerPlugins(nodeModulesPath);
  const customPlugins = await findCustomPlugins(customPluginsPath);

  // Comparing plugins and resolving conflicts
  const combinedPlugins = resolvePluginConflicts(easylayerPlugins, customPlugins);

  // Importing plugins
  const pluginImports = combinedPlugins.map(importAndInitializePlugin);
  return Promise.all(pluginImports);
};

export const importAndInitializePlugin = async (pluginInfo: PluginInfo): Promise<DynamicModule> => {
  const pluginIndexPath = join(pluginInfo.path, 'index.js');

  // Import the default export of one plugin
  const { default: importedModule } = await import(pluginIndexPath);

  // Plugin must export main module as default
  const importedPlugin = importedModule.default;
  if (!importedPlugin) {
    throw new Error(`The plugin ${pluginIndexPath} must be exported as default`);
  }

  if (importedPlugin && typeof importedPlugin.register === 'function') {
    const dynamicModule = await importedPlugin.register();
    if (isDynamicModule(dynamicModule)) {
      return dynamicModule;
    } else {
      throw new Error(`Method register() must return DynamicModule, plugin ${pluginIndexPath}`);
    }
  } else {
    throw new Error(`The plugin ${pluginIndexPath} must have a static method register()`);
  }
};

export const resolvePluginConflicts = (easylayerPlugins: PluginInfo[], customPlugins: PluginInfo[]): PluginInfo[] => {
  const combinedPlugins = [...easylayerPlugins];

  customPlugins.forEach((customPlugin) => {
    const existingPlugin = combinedPlugins.find((p) => p.name === customPlugin.name);
    if (existingPlugin) {
      // NOTE: There may be rewrite logic or other conflict handling here
      throw new Error(`Conflict found for plugin: ${customPlugin.name}`);
    } else {
      combinedPlugins.push(customPlugin);
    }
  });

  return combinedPlugins;
};
