import { resolvePluginConflicts } from '../import-plugins';
import { PluginInfo } from '../utils.interfaces';

describe('resolvePluginConflicts', () => {
  it('correctly combines plugins without conflicts', () => {
    const easylayerPlugins = [{ name: 'pluginA', version: 'v0.0.1', path: 'path/to/pluginA' }];
    const customPlugins = [{ name: 'pluginB', version: 'v0.0.2', path: 'path/to/pluginB' }];

    const combinedPlugins = resolvePluginConflicts(easylayerPlugins, customPlugins);

    expect(combinedPlugins).toEqual([
      { name: 'pluginA', path: 'path/to/pluginA', version: 'v0.0.1' },
      { name: 'pluginB', path: 'path/to/pluginB', version: 'v0.0.2' },
    ]);
  });

  it('throws an error when a conflict is found', () => {
    const easylayerPlugins = [{ name: 'pluginA', version: 'v0.0.1', path: 'path/to/pluginA' }];
    const customPlugins = [{ name: 'pluginA', version: 'v0.0.2', path: 'path/to/custom/pluginA' }];

    expect(() => resolvePluginConflicts(easylayerPlugins, customPlugins)).toThrow(`Conflict found for plugin: pluginA`);
  });

  it('handles empty plugin lists correctly', () => {
    const easylayerPlugins: PluginInfo[] = [];
    const customPlugins: PluginInfo[] = [];

    const combinedPlugins = resolvePluginConflicts(easylayerPlugins, customPlugins);

    expect(combinedPlugins).toEqual([]);
  });
});
