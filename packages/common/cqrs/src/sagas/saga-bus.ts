import { Injectable, Logger, OnModuleDestroy, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { InvalidSagaException } from '@nestjs/cqrs/dist/exceptions/invalid-saga.exception';
import { UnhandledExceptionBus } from '@nestjs/cqrs/dist/unhandled-exception-bus';
import { ObservableBus } from '@nestjs/cqrs/dist/utils/observable-bus';
import { ISaga } from '@nestjs/cqrs/dist/interfaces';
import { SYNC_SAGA_METADATA } from '../constants';
import { CustomEventBus } from '../custom-event-bus';

@Injectable()
export class SagaBus extends ObservableBus<any> implements OnModuleDestroy {
  protected readonly subscriptions: Subscription[];
  private readonly _logger = new Logger(SagaBus.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly unhandledExceptionBus: UnhandledExceptionBus,
    private readonly event$: CustomEventBus<any>
  ) {
    super();
    this.subscriptions = [];
  }

  onModuleDestroy() {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  register(types: Type<unknown>[] = []) {
    const sagas = types
      .map((target) => {
        const metadata = Reflect.getMetadata(SYNC_SAGA_METADATA, target) || [];
        // TODO: Provide the correct type
        const instance: any = this.moduleRef.get(target, { strict: false });
        if (!instance) {
          throw new InvalidSagaException();
        }
        return metadata.map((key: string) => instance[key].bind(instance));
      })
      .reduce((a, b) => a.concat(b), []);

    // TODO: Provide the correct type
    sagas.forEach((saga: any) => this.registerSaga(saga));
  }

  protected registerSaga(saga: ISaga<any>) {
    if (typeof saga !== 'function') {
      throw new InvalidSagaException();
    }
    const stream$ = saga(this.event$.subject$);
    if (!(stream$ instanceof Observable)) {
      throw new InvalidSagaException();
    }

    const subscription = stream$.pipe(filter((e) => !!e)).subscribe({
      next: (data) => this._logger.debug(`Saga result: ${data}`),
      error: (error) => this._logger.debug(`Saga has thrown an unhandled exception: ${error}`),
      complete: () => this._logger.debug('Saga processing completed.'),
    });

    this.subscriptions.push(subscription);
  }
}
