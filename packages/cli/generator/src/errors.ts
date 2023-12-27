import { StderrError } from './interfaces';

export function isStderrError(error: unknown): error is StderrError {
  return typeof error === 'object' && error !== null && 'stderr' in error && typeof error.stderr === 'string';
}
