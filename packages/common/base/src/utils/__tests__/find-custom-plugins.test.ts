import { findPackagesByPattern } from '../packages-utils';
import { findCustomPlugins } from '../find-custom-plugins';

jest.mock('../packages-utils', () => ({
  findPackagesByPattern: jest.fn(),
}));

describe('findCustomPlugins', () => {
  it('returns information about plugins', async () => {
    const mockPackages = [
      { path: 'path/to/plugin1', packageJson: { name: 'plugin1' } },
      { path: 'path/to/plugin2', packageJson: { name: 'plugin2' } },
    ];

    (findPackagesByPattern as jest.Mock).mockResolvedValue(mockPackages);
    const plugins = await findCustomPlugins('path/to/custom/plugins');

    expect(findPackagesByPattern).toHaveBeenCalledWith('path/to/custom/plugins', /^plugin-/);
    expect(plugins).toEqual([
      { path: 'path/to/plugin1', name: 'plugin1' },
      { path: 'path/to/plugin2', name: 'plugin2' },
    ]);
  });

  it('returns an empty array when no packages are found', async () => {
    (findPackagesByPattern as jest.Mock).mockResolvedValue([]);

    const plugins = await findCustomPlugins('path/to/custom/plugins');

    expect(findPackagesByPattern).toHaveBeenCalledWith('path/to/custom/plugins', /^plugin-/);
    expect(plugins).toEqual([]);
  });
});
