import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { AppLogger } from '@easylayer/logger';
import { WalletsCommandFactoryService } from './wallets-command-factory.service';

interface Batch {
    blockHeight: bigint;
    index: number;
    status: string;
}

@Injectable()
export class SyncManagerService {
    private _lastBlockHeight: bigint = -1n;
    private _lastBatchIndex: number = Number.MIN_SAFE_INTEGER;
    private _isProcessing: boolean = false;
    private blockProcessedPromise!: Promise<void>;
    private resolveNextBlock!: () => void;

    constructor(
        private readonly log: AppLogger,
        private readonly walletsCommandFactoryService: WalletsCommandFactoryService,
        
        // private readonly networkTransportService: 
    ) {}

    public async initBlockHeight(startHeight: bigint | string | number) {
        this.log.debug('initBlockHeight()', { startHeight }, this.constructor.name);

        // Set a new initial block height 
        this._lastBlockHeight = BigInt(startHeight);
        this._isProcessing = false;
    }

    // Так тут же батчи а не блоки, нужо таки проверять высоту блока внутри батча? 
    // Может тода два значения последний блок и последний батч. 
    // 1 - приходит по высоте блок на +1 -- то просто его сразу парсим 
    // 2 - приходит по высоте тот же блок -- могла быть реорганизация просто парсим
    // 3 - приходит блок меньше текущего -- реорганизация
    // 4 - приходит блок на > +1 значи у нас отставание по блокам. 

    // Мы должны будем смотреть и блоки и индексы батчей? хз 
    // И нужно будет с реорганизацией решать точно
    public async push(dto: any) {
        if (dto.blockHeight > this._lastBlockHeight + 1n || dto.index > this._lastBatchIndex + 1) {
            await this.pull(dto.blockHeight);
        } else {
            // Handle the event normally
            await this.processBatch(dto as Batch);
        }
    }

    public async pull(height: bigint) {
        if (this._isProcessing) {
            return;
        }

        this._isProcessing = true;
        
        // У нас тут массив который не закончиться пока не догонит все блоки недостающие. 
        while (this._lastBlockHeight < height) {

            // Вот тут мы запускаем промис который рзрешиться после обработки всего блока
            await this.blockProcessedPromise;

            // Init the promise for the next wait
            this.initBlockProcessedPromise();

            // Тут дальше или в цикле достаем батчи, или жже достаем сразу все батчи пачкой
            // или так или так
            while (this._lastBatchIndex > -1) { // Цикл пока не достанет по индексу все батчи блока
                try {
                    // высота блока всегда такая
                    // а индекс батча будет обновлен только если нет ошибки 
                    const batch = await this.pullNextBatch(height, this._lastBatchIndex);
                    await this.processBatch(batch);
                } catch(error) {
                    console.error(error);
                    // NOTE: когда в pull ошибка в команде то мы не выбрасываем ее
                    // мы просто верзвращаем и пропуем снова с тем е блоком и тем же индексом батча
                    return;
                }
            }
        }

        this._isProcessing = false;
    }

    // public async reorganizeBlocks(newStartHeight: bigint | string | number, batch: any) {
    //     this.log.debug('reorganizeBlocks()', { newStartHeight }, this.constructor.name);
    // _isProcessing
    //     // Вызываем тут комманду отката балансов кошельков. Без цикла без ничего. 
    //     // Если ошибка то Сага повторит этот метод
    //     // 
    //     await this.walletsCommandFactoryService.rollbackBalances({ batch, requestId: uuidv4() });

    //     // Update last batch index
    //     this._lastBlockHeight = BigInt(newStartHeight);
    // }

    // Обнвоялет только БЛОК
    // Также этот метод по окончании реорганизации вызовитьсяы
    // чтобы точно знать высоту и отпустить промис
    public async confirmIndexBlock(blockHeight: bigint) {

        // TODO: add checks
        this._lastBlockHeight = blockHeight;

        // Разрешаем текущий промис
        this.resolveNextBlock();

        // Инициализируем новый промис для следующего блока
        this.initBlockProcessedPromise();
    }

    private async processBatch(batch: Batch) {
        await this.walletsCommandFactoryService.index({ batch, requestId: uuidv4() });

        // Update last batch index
        this._lastBatchIndex = batch.index;
    }

    private async pullNextBatch(height: bigint, index: number, isLast: boolean = false, isFirst: boolean = false): Promise<Batch> {
        // Implement the logic to pull the next block from the first microservice
        return {} as Batch;
    }

    /**
     * Initializes the block processing promise.
     */
    private initBlockProcessedPromise(): void {
        this.blockProcessedPromise = new Promise<void>(resolve => {
            this.resolveNextBlock = resolve;
        });
    }
}
  