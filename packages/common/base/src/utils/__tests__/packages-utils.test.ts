import { isPackageJsonSafe } from '../packages-utils';

describe('isPackageJsonSafe', () => {
  test('should return true for safe package.json', () => {
    const safePackageJson = {
      name: 'safe-plugin',
      version: '1.0.0',
      dependencies: { 'safe-package': '1.0.0' },
    };

    expect(isPackageJsonSafe(safePackageJson)).toBe(true);
  });

  test('should return false for vulnerable package.json', () => {
    const vulnerablePackageJson = {
      name: 'vulnerable-plugin',
      version: '1.0.0',
      dependencies: { 'example-package': '1.5.0' },
    };

    expect(isPackageJsonSafe(vulnerablePackageJson)).toBe(false);
  });
});
