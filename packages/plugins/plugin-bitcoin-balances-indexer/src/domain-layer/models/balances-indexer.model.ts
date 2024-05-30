// import { v4 as uuidv4 } from 'uuid';
import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinBalancesIndexerInitializedEvent,
  BitcoiBalancesIndexerReorganisationEvent,
  BitcoinBalancesIndexerSynchronisationEvent,
  BitcoiBalancesIndexerReorganisationConfirmedEvent,
  BitcoinBalancesIndexerBatchAddedEvent
} from '@easylayer/domain-cqrs-components/bitcoin';

export enum BalancesIndexerStatuses {
  AWAITING = 'awaiting',
  REORGANISATION = 'reorganisation',
  SYNCHRONISATION = 'synchronisation',
}

type Batch = {
  id: string;
  index: number;
  isFinalBatch: boolean;
}

class BlockNode {
  blockHash: string;
  blockHeight: bigint;
  batches: Batch[];
  prev: BlockNode | null = null;
  next: BlockNode | null = null;

  constructor(blockHash: string, blockHeight: bigint, batches: Batch[]) {
    this.blockHash = blockHash;
    this.blockHeight = blockHeight;
    this.batches = batches;
  }
}

class Batchain {
  private head: BlockNode | null = null;
  private tail: BlockNode | null = null;
  private _size: number = 0;
  private _maxSize: number = 100;

  // Сложность: O(1)
  get size(): number {
    return this._size;
  }

  // Сложность: O(1)
  get lastBlockHeight(): bigint {
    return this.tail ? this.tail.blockHeight : -1n;
  }

  // Сложность: O(1)
  get lastBlockHash(): string {
    return this.tail ? this.tail.blockHash : '';
  }

  // Сложность: O(1)
  get lastBatchIndex(): number {
    return this.tail && this.tail.batches.length > 0 ? this.tail.batches[this.tail.batches.length - 1].index : -1;
  }

  // Сложность: O(1)
  get isFinalBatch(): boolean {
    return this.tail && this.tail.batches.length > 0 ? this.tail.batches[this.tail.batches.length - 1].isFinalBatch : false;
  }

  // Adding a batch to the list
  // Сложность: O(1)
  public addBatch(batch: Batch, blockHash: string, blockHeight: bigint): boolean {
    if (!this.validateNextBatch(batch, blockHash, blockHeight)) {
      return false;
    }

    if (!this.tail || this.tail.blockHeight !== blockHeight) {
      const newBlock = new BlockNode(blockHash, blockHeight, [batch]);
      if (this.tail) {
        this.tail.next = newBlock;
        newBlock.prev = this.tail;
      }
      this.tail = newBlock;
      if (!this.head) {
        this.head = newBlock;
      }
    } else {
      this.tail.batches.push(batch);
    }

    this._size++;

    if (this.size > this._maxSize) {
      this.removeOldestBlockNode();
    }

    return true;
  }

  // Validation of the next batch
  // Сложность: O(1)
  public validateNextBatch(batch: Batch, blockHash: string, blockHeight: bigint): boolean {
    if (!this.tail) {
      return true;
    }

    const lastBatch = this.getLastBatch();
    const { index } = batch;

    if (blockHeight === this.tail.blockHeight) {
      // Проверка хэша блока
      if (blockHash !== this.tail.blockHash) {
        console.error('Block hash mismatch due to reorganization.');
        return false;
      }
      // Проверка индекса батча
      if (index !== lastBatch!.index + 1) {
        console.error('Batch index out of order within block');
        return false;
      }
    } else if (blockHeight === this.tail.blockHeight + 1n) {
      if (index !== 0) {
        console.error('First batch index of new block must be 0');
        return false;
      }
      // ПОлучаеться что по высоте +1 мы можем любой блок всунуть, даже если была реорганизация 
      // Просто я пока не виж реальную ситуацию чтобы это случилось. 
      // Я просто оставлю тут комментарий чтобы проверить в будущем
    } else {
      console.error('Block height out of order');
      return false;
    }

    return true;
  }

  // Removing the oldest block
  // Сложность: O(1)
  private removeOldestBlockNode(): void {
    if (this.head) {
      this.head = this.head.next;
      if (this.head) {
        this.head.prev = null;
      } else {
        this.tail = null;
      }
      this._size--;
    }
  }

  // Removing batches by block hash from the point of hash till the end
  // Сложность: O(n), где n — количество блоков в списке
  public removeBlockNode(blockHash: string): void {
    if (!this.tail) {
      return;
    }

    let current: BlockNode | null = this.tail;

    while (current && current.blockHash !== blockHash) {
      current = current.prev;
    }

    if (current) {
      if (current.prev) {
        current.prev.next = null;
      } else {
        this.head = null;
      }
      this.tail = current.prev;
      this._size--;
    }
  }

  // Get batches by block hash
  // Сложность: O(n), где n — количество блоков в списке
  // public getBatchesByBlock(blockHash: string): Batch[] {
  //   let current: BlockNode | null = this.head;
  //   const result: Batch[] = [];

  //   while (current) {
  //     if (current.blockHash === blockHash) {
  //       result.push(...current.batches);
  //     }
  //     current = current.next;
  //   }

  //   return result;
  // }

  // Get the last batch
  // Сложность: O(1)
  public getLastBatch(): Batch | undefined {
    return this.tail && this.tail.batches.length > 0 ? this.tail.batches[this.tail.batches.length - 1] : undefined;
  }

  // Получение батчей последнего блока
  // Сложность: O(1)
  public getLastBlockNode(): BlockNode | null {
    return this.tail;
  }

  // Проверка необходимости реорганизации
  // Сложность: O(n), в худшем случае где n — количество блоков в списке
  public needsReorganization(batch: Batch, blockHash: string, blockHeight: bigint): boolean {
    if (!this.tail) {
      return false;
    }

    // NOTE: если высота больше последней, то сразу выходим, это значит синхронизация, а не реорганизация
    if (blockHeight > this.tail.blockHeight) {
      return false;
    }

    let current: BlockNode | null = this.tail;

    while (current) {
      if (current.blockHeight === blockHeight) {
        // Проверка хэша блока
        if (blockHash !== current.blockHash) {
          return true;
        }
        // Проверка индекса батча
        const matchingBatch = current.batches.find(b => b.index === batch.index);
        if (matchingBatch) {
          return true;
        }
        return false;
      }
      current = current.prev;
    }

    return false;
  }

  // Проверка необходимости синхронизации
  // Сложность: O(1)
  public needsSynchronization(batch: Batch, blockHash: string, blockHeight: bigint): boolean {
    if (!this.tail) {
      return false;
    }

    const heightDifference = blockHeight - this.tail.blockHeight;
    const indexDifference = batch.index - this.getLastBatch()!.index;

    return heightDifference > 1n || (heightDifference === 1n && batch.index > 0) || (heightDifference === 0n && indexDifference > 1);
  }
}

export class BalancesIndexer extends AggregateRoot {
  public aggregateId: string = 'indexer';
  public status!: BalancesIndexerStatuses;
  public chain: Batchain = new Batchain();

  // IMPORTANT: this method doing two things:
  // 1 - create BalancesIndexer if it's first creation
  // 2 - use already created params but still publish event
  public async init({ requestId }: { requestId: string }) {
    const status = this.status || 'awaiting';
    const blockHeight = this.chain.lastBlockHeight.toString();
    const blockHash = this.chain.lastBlockHash;
    const batchIndex =  this.chain.lastBatchIndex;
    const isFinalBatch = this.chain.isFinalBatch;

    await this.apply(new BitcoinBalancesIndexerInitializedEvent({
      aggregateId: this.aggregateId,
      requestId,
      status,
      blockHeight,
      blockHash,
      batchIndex,
      isFinalBatch
    }));
  }

  public async addBatch({ batch, blockHash, blockHeight, requestId }: { batch: any, blockHash: string, blockHeight: bigint | string | number, requestId: string }) {
    if (this.status !== BalancesIndexerStatuses.AWAITING && this.status !== BalancesIndexerStatuses.SYNCHRONISATION) {
      throw new Error('addBatch() BalancesIndexer did not complete reorganisation');
    }

    // TODO: add validation next batch

    await this.apply(new BitcoinBalancesIndexerBatchAddedEvent({
      aggregateId: this.aggregateId,
      requestId,
      status: BalancesIndexerStatuses.AWAITING,
      batch,
      blockHash,
      blockHeight: blockHeight.toString()
    }));
  }

  public async updateChain({ batch, blockHash, blockHeight, requestId }: { batch: any, blockHash: string, blockHeight: bigint, requestId: string }) {
    if (this.chain.needsReorganization(batch, blockHash, blockHeight)) {
      return await this.reorganisation({ reorganisationHeight: batch.blockHeight, requestId });
    } else if (this.chain.needsSynchronization(batch, blockHash, blockHeight)) {
      return await this.synchronisation({ requestId });
    } else {
      throw new Error('Updae Chain Error');
    }
  }

  public async reorganisation(
    { reorganisationHeight, requestId }:
    { reorganisationHeight: bigint | string | number, requestId: string }
  ): Promise<void> {
    // IMPORTANT: В этом методе мы получаеться откатываем все батчи блока

    if (this.status === BalancesIndexerStatuses.REORGANISATION) {
      // Все остальные статусы пропускаем
      return;
    }

    // это должно вернуть часть стурктуры blocks: Map <hash, Batch[]> 
    // мы это публикуем в ивенте
    const lastBlockNode = this.chain.getLastBlockNode();

    if (!lastBlockNode) return;

    // IMPORTANT: реорганзиация должна тольок одно событие публиковать за раз. И мы откатываем сразу весь блок

    // мы откатываем предыдущий блок полностью со всеми батчами 
    // Получаеться по одному блоку делаем откат. 
    // Структура в Batchain должна искаться по ХЭШУ БЛОКА

    await this.apply(new BitcoiBalancesIndexerReorganisationEvent({
        aggregateId: this.aggregateId,
        requestId,
        status: BalancesIndexerStatuses.REORGANISATION,
        blockBatches: lastBlockNode.batches,
        blockHash: lastBlockNode.blockHash,
        blockHeight: String(lastBlockNode.blockHeight),
        reorganisationHeight: String(reorganisationHeight)
      }));
  }

  public async confirmReorganisation({ reorganisationHeight, requestId }: { reorganisationHeight: bigint | string | number, requestId: string }) {
    if (this.status !== BalancesIndexerStatuses.REORGANISATION) {
      throw new Error('confirmReorganisation() BalancesIndexer did not start reorganisation');
    }

    if (this.chain.lastBlockHeight >= BigInt(reorganisationHeight)) {
      throw new Error('confirmReorganisation() Батчи откатились неправильно');
    }

    await this.apply(new BitcoiBalancesIndexerReorganisationConfirmedEvent({
      aggregateId: this.aggregateId,
      requestId,
      status: BalancesIndexerStatuses.AWAITING,
      reorganisationHeight: reorganisationHeight.toString()
    }));
  }

  public async synchronisation(
    { requestId }:
    { requestId: string }
  ) {
    const blockHeight = this.chain.lastBlockHeight.toString();
    const blockHash = this.chain.lastBlockHash;
    const batchIndex =  this.chain.lastBatchIndex;
    const isFinalBatch = this.chain.isFinalBatch;

    await this.apply(new BitcoinBalancesIndexerSynchronisationEvent({
      aggregateId: this.aggregateId,
      requestId,
      status: BalancesIndexerStatuses.SYNCHRONISATION,
      blockHeight,
      blockHash,
      batchIndex,
      isFinalBatch
    }));

  }

  private onBitcoinBalancesIndexerInitializedEvent({ payload }: BitcoinBalancesIndexerInitializedEvent) {
    const { aggregateId, status } = payload;
    this.aggregateId = aggregateId;
    this.status = status as BalancesIndexerStatuses;
  }

  private onBitcoinBalancesIndexerBatchAddedEvent({ payload }: BitcoinBalancesIndexerBatchAddedEvent) {
    const { aggregateId, status, blockHash, blockHeight, batch } = payload;
    this.aggregateId = aggregateId;
    this.status = status as BalancesIndexerStatuses;
    this.chain.addBatch(batch, blockHash, BigInt(blockHeight));
  }

  private onBitcoiBalancesIndexerReorganisationEvent({ payload }: BitcoiBalancesIndexerReorganisationEvent) {
    const { blockHash, status } = payload;
    this.status = status as BalancesIndexerStatuses;
    this.chain.removeBlockNode(blockHash);
  }

  private onBitcoiBalancesIndexerReorganisationConfirmedEvent({ payload }: BitcoiBalancesIndexerReorganisationConfirmedEvent) {
    const { status } = payload;
    this.status = status as BalancesIndexerStatuses;
  }

  private onBitcoinBalancesIndexerSynchronisationEvent({ payload }: BitcoinBalancesIndexerSynchronisationEvent) {
    const { status } = payload;
    this.status = status as BalancesIndexerStatuses;
  }
}
