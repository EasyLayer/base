import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { AppLogger } from '@easylayer/logger';
import { WalletsCommandFactoryService } from './wallets-command-factory.service';

interface Batch {
    id: string;
    blockHeight: bigint;
    blockHash: string;
    index: number;
    status: string;
}

@Injectable()
export class SyncManagerService {
    private _lastBlockHeight: bigint = -1n;
    private _lastBatchIndex: number = Number.MIN_SAFE_INTEGER;
    private _isProcessing: boolean = false;

    constructor(
        private readonly log: AppLogger,
        private readonly walletsCommandFactoryService: WalletsCommandFactoryService,
        
        // private readonly networkTransportService: 
    ) {}

    public async init(blockHeight: bigint | string | number, batchIndex: string | number) {
        this.log.debug('init()', { blockHeight }, this.constructor.name);

        // Set a new initial block height 
        this._lastBlockHeight = BigInt(blockHeight);
        this._lastBatchIndex = Number(batchIndex);

        // Достаем последний батч последнего по высоте блока и смотрим на сколько он опережает нас
        // NOTE: мы хотим догнать блоки до того чтобы следующий батч пушился как раз тот что нужно. 
        const lastBatch = await this.pullLastBatch();

        await this.processBatch(lastBatch);
    }

    public async processBatch(dto: any) {
        if (dto.blockHeight <= this._lastBlockHeight && dto.index <= this._lastBatchIndex) {
            // то пришел блок который уже был а это реорганизация 
            await this.reorganisation(dto as Batch);
        } else if (dto.blockHeight > this._lastBlockHeight + 1n || dto.index > this._lastBatchIndex + 1) {
            // то мы сильно отстаем нужно догонять
            await this.pull(dto.blockHeight);
        } else {
            // батч в порядке пришел как раз норм и мы сразу индексируем его
            await this.push(dto as Batch);
        }
    }

    public async push(dto: any) {
        // TODO: может очередь поставить простою какую то
        if (this._isProcessing) {
            // Это не даст пушить пока pull не закончиться
            return;
        }

        await this.walletsCommandFactoryService.index({ batch: dto, requestId: uuidv4() });

        // если будет ошибка то мы выбрасываем ее в Сагу чтобы Сага повторила? -- да
    }

    public async pull(blockHeight: bigint) {
        if (this._isProcessing) {
            return;
        }

        this._isProcessing = true;
        
        // У нас тут массив который не закончиться пока не догонит все блоки недостающие. 
        while (this._lastBlockHeight < blockHeight) {

            // Как то нужно понимать с какого индекса батчи есть, поэтому тут наверное нужно первый батч блока 
            // как то доставать всегда ? А  если он уже был то что тогда? 
            // Должна быть и проверка??

            const firstBatch = await this.pullFirstBatch();

            if (this._lastBatchIndex < firstBatch.index) {
                this._lastBatchIndex = firstBatch.index;
            }

            while (this._lastBatchIndex > -1) { // Цикл пока не достанет по индексу все батчи блока
                try {
                    const batch = await this.pullNextBatch(this._lastBlockHeight, this._lastBatchIndex);
                    // await this.indexBatch(batch);
                    await this.walletsCommandFactoryService.index({ batch, requestId: uuidv4() });

                    this._lastBatchIndex = batch.index;
                } catch(error) {
                    console.error(error);
                    // NOTE: когда в pull ошибка в команде то мы не выбрасываем ее
                    // мы просто верзвращаем и пропуем снова с тем е блоком и тем же индексом батча
                    continue;
                }
            }

            this._lastBlockHeight++;
        }

        this._isProcessing = false;
    }

    // Это реация на события от другого микросервиса 
    public async pushReorganisation(newHeight: bigint, blocksHashes: string[]) {

    }

    // Это реакция на события от этого же модуля когда мы видим несовпадения батчей
    public async pullReorganisation(batches: Batch[]) {
        if (this._isProcessing) {
          return;
        }
    
        this._isProcessing = true;
    
        for (let i = batches.length - 1; i >= 0; i--) {
          const batch = batches[i];
          let success = false;
    
          while (!success) {
            try {
                const pulledBatch = await this.pullNextBatch(batch.blockHash, batch.index);
                await this.walletsCommandFactoryService.rollback({ batch: pulledBatch, requestId: uuidv4() });
                success = true;
            } catch (error) {
              console.error(error);
              // Если произошла ошибка, продолжаем попытку с тем же батчем
            }
          }
        }
    
        this._isProcessing = false;
      }

    private async pullNextBatch(hash: string, index: number): Promise<Batch> {
        // Implement the logic to pull the next block from the first microservice
        return {} as Batch;
    }

    private async pullLastBatch(): Promise<Batch> {
        return {} as Batch;
    }

    private async pullFirstBatch(): Promise<Batch> {
        return {} as Batch;
    }
}
  