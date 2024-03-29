export interface PluginInfo {
  path: string;
  name: string;
  version: string;
}

export interface PackageJson {
  name: string;
  version: string;
  [key: string]: any;
}

export interface PackageInfo {
  path: string;
  packageJson: PackageJson;
}
