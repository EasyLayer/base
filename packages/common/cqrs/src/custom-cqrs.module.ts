import { Module, DynamicModule, OnModuleInit } from '@nestjs/common';
import { ModuleRef, ModulesContainer } from '@nestjs/core';
import { CqrsModule, CommandBus, QueryBus, EventBus, UnhandledExceptionBus, IEvent } from '@nestjs/cqrs';
import { CustomEventBus } from './custom-event-bus';
import { CustomExplorerService } from './custom-explorer.service';
import { SagaBus } from './sagas';
import { EventPublisher } from './event-publisher';

export interface CQRSModuleParameters<EB extends EventBus = EventBus, EP extends EventPublisher = EventPublisher> {
  isGlobal?: boolean;
  eventBus?: EB;
  publisher?: EP;
}

// @Global()
@Module({})
export class CustomCqrsModule<EventBase extends IEvent = IEvent> implements OnModuleInit {
  static forRoot(parameters: CQRSModuleParameters): DynamicModule {
    // const { eventBus, publisher } = parameters;

    // if (eventBus)
    // if (publisher)

    return {
      module: CustomCqrsModule,
      global: parameters.isGlobal || false,
      imports: [CqrsModule],
      providers: [
        CommandBus,
        QueryBus,
        {
          provide: SagaBus,
          useFactory: (moduleRef, unhandledExceptionBus, eventBus) => {
            return new SagaBus(moduleRef, unhandledExceptionBus, eventBus);
          },
          inject: [ModuleRef, UnhandledExceptionBus, EventBus],
        },
        {
          provide: CustomExplorerService,
          useFactory: (modulesContainer) => {
            return new CustomExplorerService(modulesContainer);
          },
          inject: [ModulesContainer],
        },
        {
          provide: EventPublisher,
          useFactory: (eventBus) => {
            return new EventPublisher(eventBus);
          },
          inject: [EventBus],
        },
        {
          provide: EventBus,
          useFactory: (commandBus: CommandBus, moduleRef: ModuleRef, unhandledExceptionBus: UnhandledExceptionBus) =>
            new CustomEventBus(commandBus, moduleRef, unhandledExceptionBus),
          inject: [CommandBus, ModuleRef, UnhandledExceptionBus],
        },
      ],
      exports: [CommandBus, QueryBus, EventBus, EventPublisher, SagaBus],
    };
  }

  constructor(
    private readonly explorerService: CustomExplorerService<EventBase>,
    private readonly eventBus: EventBus<EventBase>,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly sagaBus: SagaBus
  ) {}

  onModuleInit() {
    const { events, queries, sagas, commands, syncSagas } = this.explorerService.explore();

    this.eventBus.register(events);
    this.commandBus.register(commands);
    this.queryBus.register(queries);
    this.eventBus.registerSagas(sagas);
    this.sagaBus.register(syncSagas);
  }
}
