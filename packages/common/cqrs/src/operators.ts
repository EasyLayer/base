import { Observable, OperatorFunction, defer, of, from, mergeMap, retry, map, catchError, delay, throwError, retryWhen } from 'rxjs';
import { IEvent, ofType } from '@nestjs/cqrs';
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
  rollback: (data: T, error?: any) => Promise<void>;
  retryOpt?: RetryOptions;
}

const exponentialBackoff = (attempt: number, base: number = 1000) => Math.pow(2, attempt) * base;

export function executeWithRetry<T extends IEvent>({ event, command }: ExecuteParams<T>, baseDelay: number = 1000): OperatorFunction<T, T> {
  return (source: Observable<T>) =>
    source.pipe(
      ofType(event),
      mergeMap((payload) =>
        defer(() => from(command(payload))).pipe(
          map(() => payload),
          catchError((error) => {
            console.error(`Error in executeWithRetry: ${error}`);
            return throwError(() => error); // Ensure error is passed down for retry
          }),
          retryWhen(errors =>
            errors.pipe(
              mergeMap((error, attempt) => {
                console.log(`Retrying attempt #${attempt + 1} after error: ${error}`);
                if (attempt >= (Infinity)) {
                  // Handle case when retries exceed the limit
                  return throwError(() => new Error('Retry limit exceeded'));
                }
                return of(error).pipe(delay(exponentialBackoff(attempt, baseDelay)));
              })
            )
          )
        )
      )
    );
}

export function executeWithSkip<T extends IEvent>({ event, command }: ExecuteParams<T>): OperatorFunction<T, T> {
  return (source: Observable<T>) =>
    source.pipe(
      ofType(event),
      mergeMap((payload) =>
        defer(() => from(command(payload))).pipe(
          map(() => payload),
          catchError((error) => {
            console.error(`Error skipped: ${error}`);
            return of(payload); // Skip error
          })
        )
      )
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
      ofType(event),
      mergeMap((payload) =>
        defer(() => from(command(payload))).pipe(
          catchError((error) =>
            from(rollback(payload, error)).pipe(
              mergeMap(() => throwError(() => error)),
              retry({
                count: retryOpt.count ?? Infinity,
                delay: (error, attempt) => of(error).pipe(delay(retryOpt.delay ?? 1000))
              })
            )
          ),
          map(() => payload)
        )
      )
    );
}

