import PQueue from 'p-queue';
import { Subject } from 'rxjs';
import { Injectable } from '@nestjs/common';
import { IEventPublisher, IEvent } from '@easylayer/cqrs';

@Injectable()
export class Publisher implements IEventPublisher {
  private subject$ = new Subject<IEvent>();
  private queue = new PQueue({ concurrency: 1 });

  get events$() {
    return this.subject$.asObservable();
  }

  async publish<T extends IEvent>(event: T): Promise<void> {
    this.queue
      .add(async () => {
        // Simulate asynchronous processing
        // await new Promise(resolve => setTimeout(resolve, 3000));
        this.subject$.next(event);
      })
      .catch((error) => console.error(error));
  }

  async publishAll<T extends IEvent>(events: T[]): Promise<void> {
    for (const event of events) {
      this.queue
        .add(async () => {
          // Simulate asynchronous processing
          // await new Promise(resolve => setTimeout(resolve, 3000));
          this.subject$.next(event);
        })
        .catch((error) => console.error(error));
    }
  }
}
