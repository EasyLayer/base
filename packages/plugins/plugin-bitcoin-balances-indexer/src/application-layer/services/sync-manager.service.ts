import { Injectable } from '@nestjs/common';
import { WalletsCommandFactoryService } from './wallets-command-factory.service';

interface Batch {
    blockHeight: bigint;
    index: number;
}

@Injectable()
export class SyncManagerService {
    private _lastBlockHeight: bigint = -1n;
    private _lastBatchIndex: number = Number.MIN_SAFE_INTEGER;
    private _isPulling: boolean = false;

    constructor(
        private readonly walletsCommandFactoryService: WalletsCommandFactoryService
    ) {}

    // Тут вопрос, а мы можем как то обойтись без этой хрени с подтверждением блока? 
    // Раз у нас один батч сюда попадает, в pull, мы получаеться хотим по блоку его доставать
    // К следующему батчу мы можем перейти после индексации всего батча. Просто что к блоку другому мы не можем перейти пока не 
    // пока не подтвердиться предыдущий, 
    // РЕШЕНИЯ: получаеться что убирать тут блок нужно только после события что весь блок проиндексировался
    // а батчи будут проходить получаеться без конфирмейшена, потому что будут за раз индексирвоаться. 

    // Теперь момент, пришла пачка батчей для одного блока, и за ним сразу следующая, получаеться нам нужно ЖДАТЬ
    // Значит таки блок мы обновляем тут 

    // Обнвоялет только БЛОК
    public async confirmIndexBlock(blockHeight: bigint) {

        // TODO: add checks
        this._lastBlockHeight = blockHeight;

        // Тут мы должны резолвить промис? - если блок не обработан то мы должны выбросить ошибку и попробовать снова?
        // Вроде тут резолвим промис 
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
        if (dto.blockHeight > this._lastBlockHeight) {
            await this.pull(dto.blockHeight);
        } else {
            // Handle the event normally
            await this.processBatch(dto as Batch);
        }
    }

    public async pull(height: bigint) {
        if (this._isPulling) {
            return;
        }

        this._isPulling = true;

        // Это нужно переделать, pull должен работтаь пока не догонит по всем блокам. 
        // И батчи мы можем доставать и в цикле без конфирмейшена индексирвоать, то переход к следующему блоку
        // должен быть так же 
        
        // У нас тут массив который не закончиться пока не догонит все блоки недостающие. 
        while (this._lastBlockHeight < height) {

            // Вот тут мы запускаем промис который рзрешиться после обработки всего блока? - вроде да

            // Тут дальше или в цикле достаем батчи, или жже достаем сразу все батчи пачкой
            // или так или так
            while (this._lastBatchIndex > -1) { // Цикл пока не достанет по индексу все батчи блока
                const batch = await this.pullNextBatch(height, this._lastBatchIndex);
                await this.processBatch(batch);
            }
        }
        this._isPulling = false;
    }

    private async processBatch(batch: Batch) {
        try {
            await this.walletsCommandFactoryService.index({} as any);
        } catch (error) {
            console.error(error);
            return;
        }
        // Run command

        // Тут мы запускаем комманду индексации батча. И сразу смотрим проиндексирвоан батч или нет. 
        // ПРОБЛЕМА: я тут вижу что когда обновлять высоту? индексация блока это будет транзакционность или нет? 
        // если да то когда блок обновлять? Чтобы начать следующую итерацию в цикле while то по сути нужно сначала завершить транзакцию 

        // Update last batch index
        this._lastBatchIndex = batch.index;

        // Допустим я решил вопрос с обновлением высоты. Что дальше? 
        // А дальше вроде только бизнес логика и реорганизация. 
        // Как я вижу, в этом сервисе нам не нужна очередь и хранить там что то много
        // мы храним в network и там будем достават ьесли что
    }

    private async pullNextBatch(height: bigint, index: number, isLast: boolean = false, isFirst: boolean = false): Promise<Batch> {
        // Implement the logic to pull the next block from the first microservice
        return {} as Batch;
    }
}
  