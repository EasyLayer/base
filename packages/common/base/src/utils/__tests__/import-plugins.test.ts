import { resolvePluginConflicts } from '../import-plugins';
import { PluginInfo } from '../utils.interfaces';

describe('resolvePluginConflicts', () => {
  it('correctly combines plugins without conflicts', () => {
    const easylayerPlugins = [{ name: 'pluginA', path: 'path/to/pluginA' }];
    const customPlugins = [{ name: 'pluginB', path: 'path/to/pluginB' }];

    const combinedPlugins = resolvePluginConflicts(easylayerPlugins, customPlugins);

    expect(combinedPlugins).toEqual([
      { name: 'pluginA', path: 'path/to/pluginA' },
      { name: 'pluginB', path: 'path/to/pluginB' },
    ]);
  });

  it('throws an error when a conflict is found', () => {
    const easylayerPlugins = [{ name: 'pluginA', path: 'path/to/pluginA' }];
    const customPlugins = [{ name: 'pluginA', path: 'path/to/custom/pluginA' }];

    expect(() => resolvePluginConflicts(easylayerPlugins, customPlugins)).toThrow(`Conflict found for plugin: pluginA`);
  });

  it('handles empty plugin lists correctly', () => {
    const easylayerPlugins: PluginInfo[] = [];
    const customPlugins: PluginInfo[] = [];

    const combinedPlugins = resolvePluginConflicts(easylayerPlugins, customPlugins);

    expect(combinedPlugins).toEqual([]);
  });
});
