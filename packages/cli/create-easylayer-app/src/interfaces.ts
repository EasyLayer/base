export interface CommandOptions {
  noRun?: boolean;
  debug?: boolean;
  quickstart?: boolean;
  plugins?: string[];
}

export interface PluginInfo {
  version: string;
  name: string;
}

export interface AvailablePlugins {
  [key: string]: PluginInfo;
}

export interface Answers {
  directory: string;
  quick: boolean;
  plugins: string[];
}
