// TODO: Think about how to store plugin lists, in one file or in several?
import walletsPlugins from '@easylayer/utils/plugins/wallets-list.json';
import exchangesPlugins from '@easylayer/utils/plugins/parsers-list.json';
import parsersPlugins from '@easylayer/utils/plugins/exchanges-list.json';
import { AvailablePlugins } from '../interfaces';

const availablePlugins: AvailablePlugins = {
  ...walletsPlugins,
  ...exchangesPlugins,
  ...parsersPlugins,
};

const availablePluginNames = Object.values(availablePlugins).map((plugin) => plugin.name);

export const parsePlugins = (value: string) => {
  return value.split(',').map((plugin) => plugin.trim());
};

export const validatePlugins = (plugins: string[]) => {
  const invalidPlugins = plugins.filter((pluginName) => !availablePluginNames.includes(pluginName));

  if (invalidPlugins.length > 0) {
    throw new Error(`Invalid plugins specified: ${invalidPlugins.join(', ')}`);
  }
};

export const formatPluginsChoices = (plugins: any) => {
  return Object.values(plugins).map((plugin: any) => ({
    name: plugin.name + ' (' + plugin.version + ')',
    value: plugin.name,
  }));
};

export const getAllPluginsChoices = () => {
  return [
    ...formatPluginsChoices(walletsPlugins),
    ...formatPluginsChoices(exchangesPlugins),
    ...formatPluginsChoices(parsersPlugins),
  ];
};
