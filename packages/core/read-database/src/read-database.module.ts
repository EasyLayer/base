import { resolve } from 'node:path';
import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions, getDataSourceToken } from '@nestjs/typeorm';
import { addTransactionalDataSource, initializeTransactionalContext } from 'typeorm-transactional';
import { DataSource, DataSourceOptions } from 'typeorm';
import { LoggerModule, AppLogger } from '@easylayer/components/logger';
import { ReadDatabaseService } from './read-database.service';

type ReadDatabaseModuleConfig = TypeOrmModuleOptions & {
  type: 'sqlite' | 'postgres' | 'mysql' | 'mongodb';
  name: string;
  // eslint-disable-next-line @typescript-eslint/ban-types
  entities: Function[];
};

@Module({})
export class ReadDatabaseModule {
  static forRoot(config: ReadDatabaseModuleConfig): DynamicModule {
    const { name, entities = [], ...restOptions } = config;

    // Initialize transactional context before setting up the database connections
    initializeTransactionalContext();

    // TODO: remove from here
    const database = restOptions.type === 'sqlite' ? resolve(process.cwd(), 'easylayer/data', `${name}.db`) : name;

    return {
      module: ReadDatabaseModule,
      imports: [
        // IMPORTANT: 'name' - is required everywhere and for convenience we indicate it the same
        // so as not to get confused. It must be unique to the one module connection.
        TypeOrmModule.forRootAsync({
          imports: [LoggerModule.forRoot({ componentName: 'BitcoinReadDatabaseComponent' })],
          name,
          useFactory: (log: AppLogger) => ({
            ...restOptions,
            name,
            database,
            // entities: custom entities,
            entities,
            log,
          }),
          inject: [AppLogger],
          dataSourceFactory: async (options?: DataSourceOptions & { log?: AppLogger }) => {
            if (!options) {
              throw new Error('Invalid options passed');
            }

            if (options && options.log) {
              options.log.info(`Connecting to read database...`, {}, this.constructor.name);
            }

            const dataSource = new DataSource(options);
            await dataSource.initialize();

            // TODO: move its somewhere
            // Apply PRAGMA settings (for improve writing) for SQLite
            if (restOptions.type === 'sqlite') {
              await dataSource.query('PRAGMA cache_size = 10000;');
              await dataSource.query('PRAGMA temp_store = MEMORY;');
              // await dataSource.query('PRAGMA locking_mode = EXCLUSIVE;');
              await dataSource.query('PRAGMA mmap_size = 268435456;');

              await dataSource.query('PRAGMA synchronous = OFF;'); // NORMAL;
              await dataSource.query('PRAGMA journal_mode = OFF;'); // WAL
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
              options.log.info(`Successfully connected to read database.`, {}, this.constructor.name);
            }

            return dataSource;
          },
        }),
        //
        TypeOrmModule.forFeature(entities, name),
      ],
      providers: [
        {
          provide: ReadDatabaseService,
          useFactory: async (dataSource: DataSource) => {
            return new ReadDatabaseService(dataSource);
          },
          inject: [getDataSourceToken(name)],
        },
      ],
      exports: [TypeOrmModule, ReadDatabaseService],
    };
  }
}
