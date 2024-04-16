import { Observable, OperatorFunction, defer, of, from, concatMap } from 'rxjs';
import { retry, map, catchError } from 'rxjs/operators';
import { IEvent } from '@nestjs/cqrs';
import { Type } from '@nestjs/common';

export interface RetryOptions {
  count?: number;
  delay?: number;
}

export interface ExecuteParams<T extends IEvent> {
  event: Type<T>;
  command: (data: T) => Promise<any>;
}

export interface ExecuteWithRollbackParams<T extends IEvent> {
  event: Type<T>;
  command: (data: T) => Promise<any>;
  rollback: (data: T, error: any) => Promise<void>;
  retryOpt?: RetryOptions;
}

export function execute<T extends IEvent>({ event, command }: ExecuteParams<T>): OperatorFunction<T, T> {
  return (source: Observable<T>) =>
    source.pipe(
      // concatMap -
      concatMap((payload) => {
        if (payload instanceof event) {
          // defer -
          return defer(() => command(payload as T)).pipe(map(() => payload));
        }

        // If the event does not match the expected type, simply skip it further without changes
        return of(payload);
      })
    );
}

export function executeWithRollback<T extends IEvent>({
  event,
  command,
  rollback,
  retryOpt = {},
}: ExecuteWithRollbackParams<T>): OperatorFunction<T, T> {
  return (source: Observable<T>) =>
    source.pipe(
      // concatMap -
      concatMap((payload) => {
        if (payload instanceof event) {
          // defer -
          return defer(() => command(payload as T)).pipe(
            catchError((error) => {
              // from -
              return from(rollback(payload, error)).pipe(
                retry({
                  count: retryOpt.count ?? Infinity,
                  delay: retryOpt.delay ?? 1000,
                  resetOnSuccess: true,
                })
              );
            }),
            map(() => payload)
          );
        }

        // If the event does not match the expected type, simply skip it further without changes
        return of(payload);
      })
    );
}
