import { Injectable } from '@nestjs/common';
import Piscina from 'piscina';
import { ConnectionManager } from '@easylayer/bitcoin-network-provider';
import { BlocksQueue } from './blocks-queue';
import { Block } from './interfaces';

@Injectable()
export class BlocksQueueService {
  private blockQueue = new BlocksQueue<Block>();
  private workerPool: Piscina;
  private maxQueueSize = 10; // TODO: move into env
  private commonHeight = 1;

  constructor(
    private readonly commandFactory: any,
    private readonly connectionManager: ConnectionManager

  ) {
    this.workerPool = new Piscina({
      filename: 'path/to/worker.js',
      minThreads: 1,
      maxThreads: 4 // TODO: max threads = cpu * 2 - 2
    });

    this.startQueueIteratting();
  }

  async startBlocksLoading(commonHeight: number): Promise<void> {
    this.commonHeight = commonHeight;
    const activeTasks = new Set();
    while (true) {
      while (this.blockQueue.length < this.maxQueueSize && activeTasks.size < this.workerPool.options.maxThreads) {
        const task = this.loadBlock(this.commonHeight++)
          .then(block => {
            this.blockQueue.enqueue(block);
            activeTasks.delete(task);
          })
          .catch(error => {
            console.error(error);
            activeTasks.delete(task);
          });

        activeTasks.add(task);
      }
      if (activeTasks.size > 0) {
        await Promise.allSettled(Array.from(activeTasks));
      }
    }
  }
  
  reorganizeBlocks(newStartHeight: number): void {
    this.blockQueue.clear();
    this.commonHeight = newStartHeight; // Устанавливаем новую начальную высоту для загрузки блоков
  }

  private async loadBlock(height: number): Promise<Block> {
    return this.workerPool.run({ height, adapters: this.connectionManager.adapters });
  }

  private async startQueueIteratting(): Promise<void> {
    while (true) {
      const block = await this.blockQueue.dequeue(); // This will wait for a block to be available
      if (block) {
        await this.processBlock(block);
      }
    }
  }

  private async processBlock(block: Block): Promise<void> {
    try {
      await this.commandFactory.indexBlockCommand(block);
      // Block is automatically removed from the queue by dequeue
    } catch (error) {
      console.error('Failed to process block:', error);
      this.blockQueue.requeue(block); // Переставляем блок обратно в начало очереди для повторной обработки
    }
  }
}
