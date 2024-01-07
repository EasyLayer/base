import { resolve } from 'node:path';
import { readFileSync } from 'fs-extra';
import { AvailablePlugins, PluginInfo } from '../interfaces';

const availablePlugins: AvailablePlugins = JSON.parse(
  readFileSync(resolve(__dirname, '../../plugins-list.json'), 'utf8')
);
console.log('availablePlugins\n', availablePlugins);
const availablePluginNames = Object.values(availablePlugins).map((plugin: PluginInfo) => plugin.name);

export const parsePlugins = (value: string) => {
  return value.split(',').map((plugin) => plugin.trim());
};

export const validatePlugins = (plugins: string[]) => {
  const invalidPlugins = plugins.filter((pluginName) => !availablePluginNames.includes(pluginName));

  if (invalidPlugins.length > 0) {
    throw new Error(`Invalid plugins specified: ${invalidPlugins.join(', ')}`);
  }
};

export const formatPluginsChoices = (plugins: AvailablePlugins) => {
  return Object.values(plugins).map((plugin) => ({
    name: `${plugin.name} (${plugin.version})`,
    value: plugin.name,
  }));
};

export const getAllPluginsChoices = () => {
  return formatPluginsChoices(availablePlugins);
};
