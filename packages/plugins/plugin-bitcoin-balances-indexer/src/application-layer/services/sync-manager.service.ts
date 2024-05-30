import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { AppLogger } from '@easylayer/logger';
import { WalletsBatchCommandFactoryService } from './wallets-batch-command-factory.service';

// interface onTransactionBatchDto {
//     id: string;
//     blockHeight: string;
//     blockHash: string;
//     batchIndex: number;
//     isFinalBatch: boolean;
// }

@Injectable()
export class SyncManagerService {
    private _isProcessing: boolean = false;

    constructor(
        private readonly log: AppLogger,
        private readonly walletsBatchCommandFactoryService: WalletsBatchCommandFactoryService,
        
        // private readonly networkTransportService: 
    ) {}

    public async onTransactionsBatch({
        batch,
        blockHash,
        blockHeight,
        requestId
    }: any) {
        // TODO: может очередь поставить простою какую то
        if (this._isProcessing) {
            return;
        }

        this._isProcessing = true;

        try {
            await this.walletsBatchCommandFactoryService.index({
                batch,
                blockHash,
                blockHeight,
                requestId
            });
        } catch (error) {
            console.error(error);
            this._isProcessing = false;
            return;
        }
    }

    public async sync({ indexedBlockHeight, indexedBatchIndex, requestId }: any) {
        if (this._isProcessing) {
            return;
        }

        this._isProcessing = true;

        // Достаем последний батч последнего по высоте блока и смотрим на сколько он опережает нас
        // NOTE: мы хотим догнать блоки до того чтобы следующий батч пушился как раз тот что нужно. 
        // Дотсеем последнего блока. это последний блок и последний батч в нем
        const lastBatch = await this.pullLastBatch();

        // У нас тут массив который не закончиться пока не догонит все блоки
        while (indexedBlockHeight >= lastBatch.blockHeight && indexedBatchIndex >= lastBatch.index) {
            while (lastBatch.isFinalBatch) {
                const nextBatchIndex = indexedBatchIndex + 1;
                // IMPORTANT: мы достаем следующий блок по высоте + 1, но с условием что в индексере 
                // есть только один блок с такой высотой у кого статус не suspended.
                const batch = await this.pullNextBatchByBlockHeight(indexedBlockHeight, nextBatchIndex);
                const { blockHeight, blockHash, ...restBatch } = batch;
                await this.walletsBatchCommandFactoryService.index({
                    batch: restBatch,
                    blockHeight,
                    blockHash,
                    requestId
                });

                indexedBatchIndex = nextBatchIndex;
            }

            indexedBlockHeight++;
        }

        this._isProcessing = false;
    }

    // Все методы что ниже можн овынести в сервис отдельный в этом компоненте
    // этот сервис будет работать с трансопртом и там может че то химичить еще
    private async pullNextBatchByBlockHeight(height: bigint | string | number, index: number): Promise<any> {
        // Эта штука в случаи Base должна доставать батчи с провайдера 
        // В случа и ж Enterprise должна уметь достать по REST или WS с Indexer + с провайдера. 
        // В провайдере должен быть метод, достать батч типо. 

        // Implement the logic to pull the next block from the first microservice
        return {} as any;
    }

    private async pullLastBatch(): Promise<any> {
        return {} as any;
    }
}
  