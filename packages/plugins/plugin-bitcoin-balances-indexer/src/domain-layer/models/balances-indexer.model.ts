// import { v4 as uuidv4 } from 'uuid';
import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinBalancesIndexerInitializedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin';

type Batch = {
  id: string;
  index: number;
  isFinalBatch: boolean;
  blockHash: string;
  blockHeight: bigint;
}

class Batchain {
  // TODO: add explanation about 2 stacks
  private batches: Batch[] = [];
  private oldestBatches: Batch[] = [];
  private _maxSize: number = 100;

  get size(): number {
    return this.batches.length + this.oldestBatches.length;
  }

  get lastBlockHeight(): bigint {
    const lastBatch = this.getLastBatch();
    return lastBatch ? lastBatch.blockHeight : -1n;
  }

  get lastBlockHash(): string {
    const lastBatch = this.getLastBatch();
    return lastBatch ? lastBatch.blockHash : '';
  }

  get lastBatchIndex(): number {
    const lastBatch = this.getLastBatch();
    return lastBatch ? lastBatch.index : -1;
  }

  // Adding a batch to the array
  // Сложность: O(1) для добавления в конец массива, O(1) для проверки размера
  public addBatch(batch: Batch): boolean {
    if (!this.validateNextBatch(batch)) {
      return false;
    }

    this.batches.push(batch);

    if (this.size > this._maxSize) {
      this.removeOldestBatch();
    }

    return true;
  }

  // Validation of the next batch
  // Сложность: O(1)
  private validateNextBatch(batch: Batch): boolean {
    const lastBatch = this.getLastBatch();

    if (lastBatch) {
      const { blockHeight, blockHash, index } = batch;

      if (blockHeight === lastBatch.blockHeight && blockHash !== lastBatch.blockHash) {
        console.error('Block hash mismatch due to reorganization.');
        return false;
      }

      if (blockHeight === lastBatch.blockHeight) {
        if (index !== lastBatch.index + 1) {
          console.error('Batch index out of order within block');
          return false;
        }
      } else if (blockHeight === lastBatch.blockHeight + 1n) {
        if (index !== 0) {
          console.error('First batch index of new block must be 0');
          return false;
        }
      } else {
        console.error('Block height out of order');
        return false;
      }
    }

    return true;
  }

  // Removing the oldest batch using two stacks
  // Сложность: O(1) для перемещения элементов между стеками, O(1) для удаления из стека
  private removeOldestBatch(): void {
    if (this.oldestBatches.length === 0) {
      while (this.batches.length > 0) {
        this.oldestBatches.push(this.batches.pop()!);
      }
    }

    this.oldestBatches.pop();

    // Очищаем стек oldestBatches, если он пуст
    if (this.oldestBatches.length === 0) {
      this.oldestBatches = [];
    }
  }


  // Removing batches by block hash
  // Сложность: O(n) для фильтрации массива, где n — общее количество батчей
  // Мы предполагаем что батчей будет не много 
  public removeBatchesByBlocks(hashes: string[]): void {
    this.batches = this.batches.filter(batch => !hashes.includes(batch.blockHash));
    this.oldestBatches = this.oldestBatches.filter(batch => !hashes.includes(batch.blockHash));
  }

  // Get batches by block hash
  // Сложность: O(n) для фильтрации массива, где n — общее количество батчей
  // Мы предполагаем что батчей будет не много 
  public getBatchesByBlock(hash: string): Batch[] {
    return [...this.batches, ...this.oldestBatches].filter(batch => batch.blockHash === hash);
  }

  // Get the last batch
  // Сложность: O(1)
  private getLastBatch(): Batch | undefined {
    if (this.batches.length > 0) {
      return this.batches[this.batches.length - 1];
    }
    if (this.oldestBatches.length > 0) {
      return this.oldestBatches[this.oldestBatches.length - 1];
    }
    return undefined;
  }

  // Получение батчей последнего блока
  // Сложность: O(n) для фильтрации массива, где n — общее количество батчей
  // Мы предполагаем что батчей будет не много 
  public getBatchesOfLastBlock(): Batch[] {
    const lastBlockHash = this.lastBlockHash;
    return this.getBatchesByBlock(lastBlockHash);
  }
}

export class BalancesIndexer extends AggregateRoot {
  public aggregateId: string = 'indexer';
  public status!: string;
  public chain: Batchain = new Batchain();

  // IMPORTANT: this method doing two things:
  // 1 - create BalancesIndexer if it's first creation
  // 2 - use already created params but still publish event
  public async init({ requestId }: { requestId: string }) {
    const status = this.status || 'awaiting';
    const height = this.chain.lastBlockHeight;
    const hash = this.chain.lastBlockHash;

    await this.apply(new BitcoinBalancesIndexerInitializedEvent({
      aggregateId: this.aggregateId,
      requestId,
      status,
      blockHeight: height.toString(),
      blockHash: hash,
      batchIndex: this.chain.lastBatchIndex
    }));
  }

  public async reorganisation(
    { batch, requestId }:
    { batch: any, requestId: string }
  ): Promise<void> {
    // IMPORTANT: В этом методе мы получаеться откатываем все батчи блока
    // Может какие то батчи и валидные, но мы сразу откатываем весь блок

    if (this.status !== 'awaiting' && this.status !== 'reorganisation') {
      throw new Error('reorganisation () Previous Balances did not complete indexing');
    }

    // IMPORTANT: мы проверку реорагнизации делаем в команде, так как нам там нужен доступ 
    // к управлению что комитить.
    // Тут мы ее уже не делаем. Хотя можем и делать если там сложнатьс не большая

    // это должно вернуть часть стурктуры blocks: Map <hash, Batch[]> 
    // мы это публикуем в ивенте
    // + статус реорганизации
    const lastBlockBatches = this.chain.getBatchesOfLastBlock();

    if (lastBlockBatches.length === 0) {
      // Batchain is empty
      return;
    }

    // IMPORTANT: реорганзиация должна тольок одно событие публиковать за раз. И мы откатываем сразу весь блок

    // ВОПРОС: мы тут должны 
    // а) - один батч опубликовать 
    // б) - все батчи блока опубликовать 
    // с) - узнать до какого блока будет откат и все это опубликовать? Я могу узнать до какого блока? --
    // мы откатываем предыдущий блок полностью со всеми батчами 
    // Получаеться по одному блоку делаем откат. 
    // Структура в Batchain должна искаться по ХЭШУ БЛОКА

    // await this.apply(new BitcoinIndexerReorganisationEvent({
    //     aggregateId: this.aggregateId,
    //     requestId,
    //     status: 'reorganisation',
    //     block: oldBlock
    //   }));
  }

  private onBitcoinBalancesIndexerInitializedEvent({ payload }: BitcoinBalancesIndexerInitializedEvent) {
    const { aggregateId, status } = payload;
    this.aggregateId = aggregateId;
    this.status = status;
  }
}
