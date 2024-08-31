import { Injectable } from '@nestjs/common';
import { InjectDataSource, DataSource, Repository } from '@easylayer/core/views-rdbms-db';
import { AppLogger } from '@easylayer/components/logger';
import { ReadDatabaseConfig } from '../../config';

@Injectable()
export class ViewsWriteRepositoryService {
  private operations: Array<{ entityName: string; method: string; data: any[] }> = [];

  constructor(
    @InjectDataSource('indexer-views')
    private readonly datasource: DataSource,
    private readonly config: ReadDatabaseConfig,
    private readonly log: AppLogger
  ) {}

  private getRepository<T extends object>(entityName: string): Repository<T> {
    const entityMetadata = this.datasource.entityMetadatas.find(
      (metadata) =>
        metadata.tableName === entityName || metadata.targetName === entityName || metadata.target === entityName
    );

    if (!entityMetadata) {
      throw new Error(`Entity with name "${entityName}" not found.`);
    }

    return this.datasource.getRepository<T>(entityMetadata.target);
  }

  public process(models: Array<{ getOperationsHistory: () => Array<{ method: string; params: any }> }> = []): void {
    models.forEach((model) => {
      const entityName = model.constructor.name;
      const operationsHistory = model.getOperationsHistory();

      for (const operation of operationsHistory) {
        const { method, params } = operation;
        this.addOperation(entityName, method, params);
      }
    });
  }

  private addOperation(entityName: string, method: string, params: any): void {
    let existingOperation = this.operations.find((op) => op.entityName === entityName && op.method === method);

    if (!existingOperation) {
      existingOperation = { entityName, method, data: [] };
      if (method === 'delete' || method === 'update') {
        this.operations.unshift(existingOperation);
      } else {
        this.operations.push(existingOperation);
      }
    }

    // Проверка на единственность данных для `delete` и `update`
    if (method === 'delete' || method === 'update') {
      existingOperation.data = [params]; // Перезаписываем данные, оставляем только одну запись
    } else {
      existingOperation.data.push(params);
    }
  }

  public async commit(): Promise<void> {
    if (this.operations.length === 0) {
      throw new Error('No operations to commit');
    }

    const batchSize = this.config.BITCOIN_INDEXER_READ_DB_SQLITE_CHANKS_LIMIT;

    try {
      for (const operation of this.operations) {
        const { entityName, method, data } = operation;

        if (method === 'insert' && data.length > batchSize) {
          const chunkedBatches = this.chunkArray(data, batchSize);
          for (const chunk of chunkedBatches) {
            await this.executeOperation(method, entityName, chunk);
          }
        } else {
          await this.executeOperation(method, entityName, data);
        }
      }

      this.clearOperations();
    } catch (error) {
      this.clearOperations();
      throw error;
    }
  }

  public async executeOperation(method: string, entityName: string, data: any): Promise<void> {
    switch (method) {
      case 'insert':
        await this.insert(entityName, data);
        break;
      case 'update':
        await this.update(entityName, data[0]); // Передаем первую (и единственную) запись для обновления
        break;
      case 'delete':
        await this.delete(entityName, data[0]); // Передаем первую (и единственную) запись для удаления
        break;
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  public async insert(entityName: string, values: any[]): Promise<void> {
    const repo = this.getRepository(entityName);
    await repo.createQueryBuilder().insert().values(values).orIgnore().updateEntity(false).execute();
  }

  public async update(
    entityName: string,
    params: { values: Record<string, any>; conditions: Record<string, any> }
  ): Promise<any> {
    const repo = this.getRepository(entityName);
    const queryBuilder = repo.createQueryBuilder().update().set(params.values);

    Object.entries(params.conditions).forEach(([column, value]) => {
      if (Array.isArray(value)) {
        queryBuilder.andWhere(`${column} IN (:...${column})`, { [column]: value });
      } else {
        queryBuilder.andWhere(`${column} = :${column}`, { [column]: value });
      }
    });

    return await queryBuilder.execute();
  }

  public async delete(entityName: string, conditions: Record<string, any>): Promise<void> {
    const repo = this.getRepository(entityName);
    const queryBuilder = repo.createQueryBuilder().delete();

    Object.keys(conditions).forEach((key) => {
      queryBuilder.andWhere(`${key} = :${key}`, { [key]: conditions[key] });
    });

    await queryBuilder.execute();
  }

  private clearOperations(): void {
    this.operations = [];
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const results: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      results.push(array.slice(i, i + chunkSize));
    }
    return results;
  }
}
