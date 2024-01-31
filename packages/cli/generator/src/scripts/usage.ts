import os from 'os';
// import _ from 'lodash';
import sentry from '@sentry/node';
import { Scope } from '../interfaces';
import { isStderrError } from '../errors';

export const captureException = async (error: Error) => {
  try {
    sentry.captureException(error);
    await sentry.flush();
  } catch (err) {
    // ignore errors
    return Promise.resolve();
  }
};

export const captureStderr = async (event: string, error: unknown) => {
  if (isStderrError(error) && error.stderr.trim() !== '') {
    error.stderr
      .trim()
      .split('\n')
      .forEach((line) => {
        sentry.addBreadcrumb({
          category: 'stderr',
          message: line,
          level: 'error',
        });
      });
  }

  return captureError(event);
};

const captureError = async (message: string) => {
  try {
    sentry.captureMessage(message, 'error');
    await sentry.flush();
  } catch (err) {
    // ignore errors
    return Promise.resolve();
  }
};

const getProperties = (scope: Scope) => {
  const userProperties = {
    os: os.type(),
    osPlatform: os.platform(),
    osArch: os.arch(),
    osRelease: os.release(),
    nodeVersion: process.versions.node,
  };
  const groupProperties = {
    version: scope.appVersion,
    noRun: scope.noRun,
    appUuid: scope.uuid,
  };

  return {
    ...userProperties,
    ...groupProperties,
  };
};

const trackEvent = async (event: string, payload: Record<string, unknown>) => {
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  try {
    sentry.captureMessage(event, {
      level: 'info',
      extra: payload,
    });
    await sentry.flush();
  } catch (err) {
    // ignore errors
    return Promise.resolve();
  }
};

export const trackUsage = async (event: string, scope: Scope) => {
  const properties = getProperties(scope);

  try {
    return await trackEvent(event, properties);
  } catch (err) {
    // ignore errors
    return Promise.resolve();
  }
};
