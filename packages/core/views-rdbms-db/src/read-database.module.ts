import { resolve } from 'node:path';
import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions, getDataSourceToken } from '@nestjs/typeorm';
import { addTransactionalDataSource, initializeTransactionalContext } from 'typeorm-transactional';
import { DataSource, DataSourceOptions, EntitySchema } from 'typeorm';
import { LoggerModule, AppLogger } from '@easylayer/components/logger';
import { ReadDatabaseService } from './read-database.service';

type ReadDatabaseModuleConfig = TypeOrmModuleOptions & {
  path: string;
  type: 'sqlite' | 'postgres' | 'mysql' | 'mongodb';
  name: string;
  // eslint-disable-next-line @typescript-eslint/ban-types
  entities: (Function | EntitySchema<any>)[];
};

@Module({})
export class ReadDatabaseModule {
  static async forRoot(config: ReadDatabaseModuleConfig): Promise<DynamicModule> {
    const { name, entities = [], path, ...restOptions } = config;

    // Initialize transactional context before setting up the database connections
    initializeTransactionalContext();

    const database = restOptions.type === 'sqlite' ? resolve(process.cwd(), path, `${name}.db`) : name;

    const dataSourceOptions = {
      ...restOptions,
      name,
      database,
      entities,
      synchronize: false, // Disable synchronization by default
    };

    const tempDataSource = new DataSource(dataSourceOptions);

    try {
      // Checking presence of tables using Promise.all
      const queryRunner = tempDataSource.createQueryRunner();
      const tableChecks = entities.map((entity) => queryRunner.hasTable(entity.constructor.name));

      const results = await Promise.all(tableChecks);

      const hasTables = results.every((exists) => exists);

      if (!hasTables) {
        // If any table is missing, enable synchronization
        dataSourceOptions.synchronize = true;
      }

      await tempDataSource.destroy();
    } catch (error) {
      console.error('Error during tables checking - enable synchronize mode.');
      dataSourceOptions.synchronize = true;
    }

    return {
      module: ReadDatabaseModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [LoggerModule.forRoot({ componentName: 'RDBMSDatabaseComponent' })],
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

            if (options.log) {
              options.log.info(`Connecting to read database...`, {}, this.constructor.name);
            }

            const dataSource = new DataSource(options);

            try {
              await dataSource.initialize();
            } catch (error) {
              if (options.log) {
                options.log.error(`Unable to connect to the database ${name}`, error, this.constructor.name);
              }
            }

            if (restOptions.type === 'sqlite') {
              await dataSource.query('PRAGMA cache_size = 10000;');
              await dataSource.query('PRAGMA temp_store = MEMORY;');
              await dataSource.query('PRAGMA mmap_size = 268435456;');
              await dataSource.query('PRAGMA synchronous = OFF;');
              await dataSource.query('PRAGMA journal_mode = OFF;');
              await dataSource.query('PRAGMA journal_size_limit = 6144000;');
              await dataSource.query('PRAGMA wal_checkpoint(TRUNCATE);');
            }

            addTransactionalDataSource({
              name,
              dataSource,
            });

            if (options.log) {
              options.log.info(`Successfully connected to read database.`, {}, this.constructor.name);
            }

            return dataSource;
          },
        }),
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
