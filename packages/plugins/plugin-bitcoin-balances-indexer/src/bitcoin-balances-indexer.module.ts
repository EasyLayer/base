import { v4 as uuidv4 } from 'uuid';
import { Module, DynamicModule } from '@nestjs/common';
import { transformAndValidateSync } from 'class-transformer-validator';
import { LoggerModule } from '@easylayer/logger';
import { ArithmeticService } from '@easylayer/arithmetic';
import { EventStoreModule } from '@easylayer/eventstore';
// import { ReadDatabaseModule } from '@easylayer/read-database';
import { BitcoinBalancesIndexerController } from './bitcoin-balances-indexer.controller';
import { BitcoinBalancesIndexerService } from './bitcoin-balances-indexer.service';
import { AppConfig, ProvidersConfig } from './config';
import { BalancesIndexerSaga } from './application-layer/sagas';
import {
  WalletsCommandFactoryService,
  BalancesIndexerCommandFactoryService,
} from './application-layer/services';
import {
  BalancesIndexerModelFactoryService,
} from './domain-layer/services';
import { CommandHandlers } from './domain-layer/command-handlers';
// import { EventsHandlers } from './domain-layer/events-handlers';

@Module({})
export class BitcoinBalancesIndexerModule {
  static register(): DynamicModule {
    const providersConfig = transformAndValidateSync(ProvidersConfig, process.env, {
      transformer: { enableImplicitConversion: true },
      validator: { whitelist: true },
    });

    return {
      module: BitcoinBalancesIndexerModule,
      controllers: [BitcoinBalancesIndexerController],
      imports: [
        LoggerModule.forRoot({ componentName: 'BitcoinBalancesIndexerModule' }),
        // TODO: move configs into envs
        EventStoreModule.forRoot({
          type: 'sqlite',
          name: 'balances-indexer-write',
          // database: '',
          synchronize: true,
          logging: false, // true
          enableWAL: true,
          // Now, when attempting to perform an operation that encountered a block,
          // SQLite will attempt to retry the operation for the specified time before returning an error. 
          // busyTimeout: 1000
        }),
        // ReadDatabaseModule.forRoot({
        //   type: 'sqlite',
        //   name: 'balances-indexer-read',
        //   // database: '',
        //   synchronize: true,
        //   logging: true, // false
        //   enableWAL: true,
        //   entities: []
        // })
      ],
      providers: [
        {
          provide: AppConfig,
          useValue: transformAndValidateSync(AppConfig, process.env, {
            transformer: { enableImplicitConversion: true },
            validator: { whitelist: true },
          }),
        },
        {
          provide: ProvidersConfig,
          useValue: providersConfig,
        },
        ArithmeticService,
        BitcoinBalancesIndexerService,
        BalancesIndexerSaga,
        WalletsCommandFactoryService,
        BalancesIndexerCommandFactoryService,
        BalancesIndexerModelFactoryService,
        ...CommandHandlers,
        // ...EventsHandlers
      ],
      exports: [],
    };
  }
}
