import { Module, OnModuleInit, Inject } from '@nestjs/common';
import { EventBus, CustomEventBus } from '@easylayer/cqrs';
import { Publisher } from './publisher';
import { Subscriber } from './subscriber';

@Module({
  providers: [Publisher, Subscriber],
})
export class CqrsTransportModule implements OnModuleInit {
  constructor(
    @Inject(EventBus)
    private readonly event$: CustomEventBus,
    private readonly publisher: Publisher
  ) {}

  async onModuleInit(): Promise<void> {
    this.event$.publisher = this.publisher;
  }
}
