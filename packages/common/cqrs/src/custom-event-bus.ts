import { CommandBus, EventBus, IEvent, UnhandledExceptionBus, IEventHandler, ICommand } from '@nestjs/cqrs';
import { Type, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { defer, of } from 'rxjs';
import { catchError, concatMap } from 'rxjs/operators';
import { defaultReflectEventId } from '@nestjs/cqrs/dist/helpers/default-get-event-id';
import { EVENTS_HANDLER_METADATA } from '@nestjs/cqrs/dist/decorators/constants';
import { UnhandledExceptionInfo } from '@nestjs/cqrs/dist/interfaces';

export type EventHandlerType<EventBase extends IEvent = IEvent> = Type<IEventHandler<EventBase>>;

export class CustomEventBus<EventBase extends IEvent = IEvent> extends EventBus<EventBase> {
  private readonly _newLogger = new Logger(CustomEventBus.name);

  constructor(
    private injectCommandBus: CommandBus,
    private injectModuleRef: ModuleRef,
    private injectUnhandledExceptionBus: UnhandledExceptionBus
  ) {
    super(injectCommandBus, injectModuleRef, injectUnhandledExceptionBus);
  }

  async publish<T extends EventBase, TContext = unknown>(event: T, context?: TContext) {
    await this.publisher.publish(event, context);
  }

  async publishAll<T extends EventBase, TContext = unknown>(events: T[], context?: TContext) {
    if (this.publisher.publishAll) {
      await this.publisher.publishAll(events, context);
    } else {
      await Promise.all(events.map((event) => this.publisher.publish(event, context)));
    }
  }

  newBind(handler: IEventHandler<EventBase>, id: string) {
    const stream$ = id ? this.ofEventId(id) : this.subject$;
    const subscription = stream$
      .pipe(
        // Use concatMap to process each event sequentially
        // QUESTION: Won't this become a point of failure?
        // Maybe you still need to send all events at once,
        // and then look for mechanisms to solve the race problem when updating event handlers?
        concatMap((event) =>
          defer(() => Promise.resolve(handler.handle(event))).pipe(
            catchError((error) => {
              const unhandledError = this.newMapToUnhandledErrorInfo(event, error);
              this.injectUnhandledExceptionBus.publish(unhandledError);
              this._newLogger.error(`"${handler.constructor.name}" has thrown an unhandled exception.`, error);
              return of();
            })
          )
        )
      )
      .subscribe();
    this.subscriptions.push(subscription);
  }

  register(handlers: EventHandlerType<EventBase>[] = []) {
    handlers.forEach((handler) => this.registerHandler(handler));
  }

  protected registerHandler(handler: EventHandlerType<EventBase>) {
    const instance = this.injectModuleRef.get(handler, { strict: false });
    if (!instance) {
      return;
    }
    const events = this.newReflectEvents(handler);
    events.forEach((event) => {
      this.newBind(instance as IEventHandler<EventBase>, defaultReflectEventId(event));
    });
  }

  protected newReflectEvents(handler: EventHandlerType<EventBase>): FunctionConstructor[] {
    return Reflect.getMetadata(EVENTS_HANDLER_METADATA, handler);
  }

  protected newMapToUnhandledErrorInfo(eventOrCommand: IEvent | ICommand, exception: unknown): UnhandledExceptionInfo {
    return {
      cause: eventOrCommand,
      exception,
    };
  }
}
