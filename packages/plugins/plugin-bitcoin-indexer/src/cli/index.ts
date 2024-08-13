import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { AppLogger } from '@easylayer/components/logger';
import { BlocksReadService } from '../domain-layer/services';
import { BitcoinIndexerModule } from '../bitcoin-indexer.module';

const program = new Command();

(async () => {
  // Create a NestJS app with plugin context
  const app = await NestFactory.createApplicationContext(BitcoinIndexerModule, {
    logger: false,
  });

  const blocksReadService = app.get(BlocksReadService);
  const logger = app.get(AppLogger);

  program.storeOptionsAsProperties(false).exitOverride(() => {
    process.exit(0);
  });

  program
    .command('db:indexers:create')
    .description('Create database indexes')
    .requiredOption('--table <table>', 'Table name')
    .requiredOption('--columns <columns>', 'Columns to index')
    .action(async (options) => {
      logger.info(`Creating indexes for table ${options.table} on columns ${options.columns}`);

      await blocksReadService.createIndexes(options.table, options.columns);

      logger.info(`Finish indexes for table ${options.table} on columns ${options.columns}`);
    });

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    logger.error('', error, 'CLI Commands');
  }

  await app.close();
})();
