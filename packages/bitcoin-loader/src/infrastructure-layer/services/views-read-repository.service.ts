import { Injectable } from '@nestjs/common';
import { InjectDataSource, DataSource, Repository } from '@easylayer/core/views-rdbms-db';
import { AppLogger } from '@easylayer/components/logger';
import { ReadDatabaseConfig } from '../../config';
import { System } from '../view-models';

@Injectable()
export class ViewsReadRepositoryService {
  constructor(
    @InjectDataSource('indexer-views') private readonly datasource: DataSource,
    private readonly config: ReadDatabaseConfig,
    private readonly log: AppLogger
  ) {}

  public getRepository<T extends object>(entityName: string): Repository<T> {
    const entityMetadata = this.datasource.entityMetadatas.find(
      (metadata) =>
        metadata.tableName === entityName || // проверка по имени таблицы
        metadata.targetName === entityName || // проверка по имени цели (класса)
        metadata.target === entityName // прямая проверка на соответствие классу
    );

    if (!entityMetadata) {
      throw new Error(`Entity with name "${entityName}" not found.`);
    }

    return this.datasource.getRepository<T>(entityMetadata.target);
  }

  public async getLastBlock(): Promise<number> {
    const repo = this.getRepository<System>('System');
    const model = await repo.findOneBy({ id: 1 });
    return model?.last_block_height || -1;
  }
}
