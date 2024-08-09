import _ from 'lodash';
import { Injectable } from '@nestjs/common';
import { AppLogger } from '@easylayer/components/logger';
import { Block } from '../interfaces';
import { BlocksQueue } from '../blocks-queue';
import { BaseCollector, TransactionsBatchesCollector, TransactionsPagesCollector } from './collectors-templates';

type TransactionsData = {
  tx: any[];
  blockHash: string;
  blockHeight: number;
};

@Injectable()
export class BlocksQueueCollectorService {
  private _queue!: BlocksQueue<Block>;
  private _block: Block | null = null;
  private _transactionsCollector!: BaseCollector;

  constructor(private readonly log: AppLogger) {
    this.createStrategy('batches');
  }

  public init(queue: BlocksQueue<Block>) {
    this.log.info('Setup blocks collecting', {}, this.constructor.name);
    this._queue = queue;
  }

  private createStrategy(strategy: 'batches' | 'pages'): void {
    if (strategy === 'batches') {
      this._transactionsCollector = new TransactionsBatchesCollector();
    } else if (strategy === 'pages') {
      this._transactionsCollector = new TransactionsPagesCollector();
    }
  }

  public addBlock(block: Block, transactionCount: number): void {
    if (this._block) {
      if (this._block.height < this._queue.lastHeight) {
        this.reset();
      }

      // We already have a block in progress so we just exit
      return;
    }

    if (block.height === this._queue.lastHeight + 1) {
      this._block = block;
      this._transactionsCollector.setExpectedTransactionCount(transactionCount);

      // If all transactions are already in the block, collect it immediately
      if (block.tx && block.tx.length === transactionCount) {
        this.collect();
      }
    } else if (block.height < this._queue.lastHeight) {
      this.reset();
    } else {
      return;
    }
  }

  public addTransactions(data: TransactionsData): void {
    if (!this._block) {
      return;
    }

    // Add transactions to the collection strategy
    this._transactionsCollector.add({ hash: this._block.hash, height: this._block.height }, data);

    // If all transactions are received, collect the block
    if (this._transactionsCollector.isComplete()) {
      this.collect();
    }
  }

  private collect(): void {
    if (!this._block) {
      return;
    }

    this._block.tx = this._transactionsCollector.collectAllTransactions();

    // Check the height of the block before adding it to the queue
    if (this._block.height !== this._queue.lastHeight + 1) {
      this.reset();
      return;
    }

    if (!this._queue.enqueue(_.cloneDeep(this._block))) {
      this.log.debug('Block was not enqueued, by collector', { height: this._block.height }, this.constructor.name);
    }

    // IMPORTANT: we do not reset memory if the block is not added because the queue is full or for some other reason
    // but just come back and next time the block will advance this block and it will be inserted if the queue is empty.
  }

  private reset(): void {
    this._block = null;
    this._transactionsCollector.reset();
  }
}
