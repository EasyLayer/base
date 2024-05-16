import { resolve } from 'node:path';
import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule, getDataSourceToken, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { DataSource, DataSourceOptions } from 'typeorm';
import { EventDataModel } from './event-data.model';
import { EventStoreRepository } from './eventstore.repository';

type EventStoreConfig = TypeOrmModuleOptions & {
  type: 'sqlite' | 'postgres' | 'mysql';
  name: string;
};

@Module({})
export class EventStoreModule {
  // TODO: add sharding logic when we autocreating new connection after 100k inserts blocks

  static forRoot(config: EventStoreConfig): DynamicModule {
    const { name, ...restOptions } = config;

    // TODO: remove from here
    const database = restOptions.type === 'sqlite' ? resolve(process.cwd(), 'data', `${name}.db`) : name;

    return {
      module: EventStoreModule,
      imports: [
        TypeOrmModule.forRootAsync({
          name,
          useFactory: () => ({
            ...restOptions,
            database,
            entities: [EventDataModel],
          }),
          dataSourceFactory: async (options?: DataSourceOptions) => {
            if (!options) {
              throw new Error('Invalid options passed');
            }
            // Add a DataSource with a unique name
            return addTransactionalDataSource({
              name,
              dataSource: new DataSource(options),
            });
          },
        }),
      ],
      providers: [
        EventStoreRepository,
        {
          provide: 'EVENT_DATA_MODEL_REPOSITORY',
          useFactory: async (dataSource: DataSource) => dataSource.getRepository(EventDataModel),
          inject: [getDataSourceToken(name)],
        },
      ],
      exports: [EventStoreRepository],
    };
  }
}
