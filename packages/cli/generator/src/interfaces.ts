export interface GeneraeOptions {
  noRun?: boolean;
  debug?: boolean;
  // Sentry.io dsn string
  sentryDsn?: string;
  easyLayerDependencies: string[];
}

export interface Scope {
  rootPath: string;
  appVersion: string;
  easyLayerDependencies: string[];
  uuid: string;
  name: string;
  noRun?: boolean;
  debug?: boolean;
}

export interface StderrError extends Error {
  stderr: string;
}
