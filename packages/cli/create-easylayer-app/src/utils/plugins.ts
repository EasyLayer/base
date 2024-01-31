import axios from 'axios';
import { PluginInfo } from '../interfaces';

const fetchNpmPluginsList = async (scope: string): Promise<PluginInfo[]> => {
  try {
    const response = await axios.get(`https://registry.npmjs.org/-/v1/search?text=${scope}&size=100`);
    return response.data.objects
      .map((pkg: any) => ({
        name: pkg.package.name,
        version: pkg.package.version,
      }))
      .filter((plugin: PluginInfo) => plugin.name.startsWith('@easylayer/plugin-'));
  } catch (error) {
    console.error(`Error fetching plugins list: ${error}`);
    return [];
  }
};

export const getAllPluginsChoices = async () => {
  return fetchNpmPluginsList('easylayer');
};

export const parsePlugins = (value: string) => {
  return value.split(',').map((plugin) => plugin.trim());
};

export const validatePlugins = async (plugins: string[]) => {
  const availablePlugins = await fetchNpmPluginsList('easylayer');
  const availablePluginNames = availablePlugins.map((plugin) => plugin.name);

  const invalidPlugins = plugins.filter((pluginName) => !availablePluginNames.includes(pluginName));

  if (invalidPlugins.length > 0) {
    throw new Error(`Invalid plugins specified: ${invalidPlugins.join(', ')}`);
  }
};
