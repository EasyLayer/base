import { resolve } from 'node:path';
import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule, getDataSourceToken, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { addTransactionalDataSource, initializeTransactionalContext } from 'typeorm-transactional';
import { DataSource, DataSourceOptions } from 'typeorm';
import { LoggerModule, AppLogger } from '@easylayer/components/logger';
import { EventDataModel } from './event-data.model';
import { SnapshotsModel } from './snapshots.model';
import { EventStoreRepository } from './eventstore.repository';
import { EventStoreService } from './eventstore.service';

type EventStoreConfig = TypeOrmModuleOptions & {
  path: string;
  type: 'sqlite' | 'postgres' | 'mysql';
  name: string;
};

@Module({})
export class EventStoreModule {
  static async forRoot(config: EventStoreConfig): Promise<DynamicModule> {
    const { name, path, ...restOptions } = config;

    // Initialize transactional context before setting up the database connections
    initializeTransactionalContext();

    // TODO: remove from here
    const database = restOptions.type === 'sqlite' ? resolve(process.cwd(), path, `${name}.db`) : name;

    const dataSourceOptions = {
      ...restOptions,
      name,
      database,
      // custom entities,
      entities: [EventDataModel],
      synchronize: false, // Disable synchronization by default
    };

    const dataSource = new DataSource(dataSourceOptions);

    try {
      await dataSource.initialize();

      // Checking for the presence of tables
      const queryRunner = dataSource.createQueryRunner();
      const hasTables = await queryRunner.hasTable(EventDataModel.constructor.name);

      if (!hasTables) {
        // If there are no tables, enable synchronization
        dataSourceOptions.synchronize = true;
      }

      await dataSource.destroy();
    } catch (error) {
      console.error('Error during tables checking', error);
      dataSourceOptions.synchronize = true;
    }

    return {
      module: EventStoreModule,
      imports: [
        // IMPORTANT: 'name' - is required everywhere and for convenience we indicate it the same
        // so as not to get confused. It must be unique to the one module connection.
        TypeOrmModule.forRootAsync({
          imports: [LoggerModule.forRoot({ componentName: 'EventStoreComponent' })],
          name,
          useFactory: (log: AppLogger) => ({
            ...dataSourceOptions,
            log,
          }),
          inject: [AppLogger],
          dataSourceFactory: async (options?: DataSourceOptions & { log?: AppLogger }) => {
            if (!options) {
              throw new Error('Invalid options passed');
            }

            if (options && options.log) {
              options.log.info(`Connecting to eventstore...`, {}, this.constructor.name);
            }

            const dataSource = new DataSource(options);
            await dataSource.initialize();

            // TODO: move its somewhere
            // Apply PRAGMA settings (for improve writing) for SQLite
            if (restOptions.type === 'sqlite') {
              await dataSource.query('PRAGMA cache_size = 10000;');
              await dataSource.query('PRAGMA temp_store = MEMORY;');
              await dataSource.query('PRAGMA locking_mode = EXCLUSIVE;');
              await dataSource.query('PRAGMA mmap_size = 268435456;');

              await dataSource.query('PRAGMA synchronous = OFF;');
              await dataSource.query('PRAGMA journal_mode = WAL;');
              await dataSource.query('PRAGMA journal_size_limit = 6144000;');

              await dataSource.query('PRAGMA wal_checkpoint(TRUNCATE);');
            }

            // Add a DataSource with a unique name
            // IMPORTANT: name use in @Transactional() decorator
            addTransactionalDataSource({
              name,
              dataSource,
            });

            if (options && options.log) {
              options.log.info(`Successfully connected to eventstore.`, {}, this.constructor.name);
            }

            return dataSource;
          },
        }),
      ],
      providers: [
        EventStoreRepository,
        {
          provide: EventStoreService,
          useFactory: async (dataSource: DataSource) => {
            return new EventStoreService(dataSource);
          },
          inject: [getDataSourceToken(name)],
        },
        {
          provide: 'EVENT_DATA_MODEL_REPOSITORY',
          useFactory: async (dataSource: DataSource) => dataSource.getRepository(EventDataModel),
          inject: [getDataSourceToken(name)],
        },
        {
          provide: 'SNAPSHOTS_MODEL_REPOSITORY',
          useFactory: async (dataSource: DataSource) => dataSource.getRepository(SnapshotsModel),
          inject: [getDataSourceToken(name)],
        },
      ],
      exports: [EventStoreRepository, EventStoreService],
    };
  }
}
