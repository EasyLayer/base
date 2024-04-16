import PQueue from 'p-queue';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { AppLogger } from '@easylayer/logger';
import { BitcoinNetworkProviderService } from '@easylayer/bitcoin-network-provider';
import { ArithmeticService } from '@easylayer/arithmetic';
import { BitcoinBlocksCommandFactoryService, BitcoinNetworkCommandFactoryService } from './application-layer/services';

@Injectable()
export class BitcoinBlocksService implements OnModuleInit {
  private queue = new PQueue({ concurrency: 1 });

  constructor(
    private readonly networkProvider: BitcoinNetworkProviderService,
    private readonly networkCommandFactory: BitcoinNetworkCommandFactoryService,
    private readonly blocksCommandFactory: BitcoinBlocksCommandFactoryService,
    private readonly arithmetic: ArithmeticService,
    private readonly log: AppLogger
  ) {}

  public async onModuleInit() {
    await this.aggregatesInitialization();

    // NOTE: This method will only end if all skipped blocks have already been indexed
    await this.indexMissedBlocks();

    // TODO: move time into env
    setInterval(() => {
      this.queue
        .add(async () => {
          await this.startIterateBlocks();
        })
        .catch((error) => this.log.error('onModuleInit()', error, this.constructor.name));
    }, 10000);
  }

  private async indexMissedBlocks(): Promise<void> {
    this.log.info('Start indexing missed blocks');

    while (true) {
      try {
        const currentNetworkBlockHeight = await this.networkProvider.getCurrentBlockHeight();
        this.log.info('Current Network Block Height: ', currentNetworkBlockHeight);

        const { indexedBlockFromHeight, indexedBlockHeight } = await this.networkCommandFactory.init({
          currentBlockHeight: currentNetworkBlockHeight,
        });

        // TODO: move  BigInt(100) into env
        if (indexedBlockFromHeight > BigInt(100)) {
          // Это значит что мы изменили на меньшое колово блоков с каких нужна индексация.
          // Поэтомы мы должны проиндексировать блоки до indexedBlockFromHeight
          // На следующей итерации когда мы будем смотреть блоки и indexedBlockFromHeight то он должен стать меньше на один.
          // Типо он должен идти вниз а не от 100 и вверх. Тогда это будет работать.

          // Мы должны сделать тут так что, если приходит очень много блоков, то мы как то пачкой все это должны уметь делать.
          // Потому что провайдер сам отвечает за то сколько блоков дать?
          // С одной стороны у каждого провайдера свои приколы и ограничния, у некоторых вообще нет получения многих да,
          // С другой стороны если я в каком то месте запрошу этот метод, то что, он мне выдаст все блоки? ну мы как минимум указываем что?
          // РЕШЕНИЕ: мы тут указываем диапазон какой нам нужен, а провайдер уже свой максимум там даст какой у него будет.
          const blocks = await this.networkProvider.getManyBlocksByHeights([
            this.arithmetic.divide(indexedBlockFromHeight, 1),
            BigInt(100),
          ]);

          // 1. Тут нужно учесть что в blocks может прийти больше (НЕТ, я там указываю конкретный диапазон)
          // 2. IMPORTANT: Все норм. Только если приходит меньше диапазона? blocks должны быть так отсортированы
          // что для этого случая от indexedBlockFromHeight и до BigInt(100) вниз, (а для случая что ниже наоборот)

          for (const block of blocks) {
            await this.blocksCommandFactory.indexBlock(block);
          }
        }

        // TODO: move BigInt(6) into env
        // Мы смотрим тут только блоки до высоты конфирмации
        if (indexedBlockHeight < currentNetworkBlockHeight - BigInt(6)) {
          // Тут получаеться что каждый раз мы будем парсить блок и прибавлять + 1 к indexedBlockHeight,
          // и когда он станет таким же как текущий то уже не нужно будет парсить
          const blocks = await this.networkProvider.getManyBlocksByHeights([
            this.arithmetic.add(indexedBlockHeight, 1),
            BigInt(2), // currentBlockHeight
          ]);

          for (const block of blocks) {
            // Лучше делать в одной комманде это.
            // Для этого можно перенести network внутрь моуля блоков
            await this.blocksCommandFactory.indexBlock(block);
          }
        }

        if (indexedBlockHeight === currentNetworkBlockHeight - BigInt(6) && indexedBlockFromHeight < BigInt(100)) {
          // The last block was successfully indexed
          break;
        }
        break;
      } catch (error) {
        this.log.error('missedBlocksChecking()', error, this.constructor.name);
        throw error;
      }
    }
  }

  private async startIterateBlocks(): Promise<void> {
    this.log.info('Start iterating blocks');

    while (true) {
      try {
        const currentNetworkBlockHeight = await this.networkProvider.getCurrentBlockHeight();
        this.log.info('Current Network Block Height: ', currentNetworkBlockHeight);

        const { indexedBlockHeight } = await this.networkCommandFactory.init({
          currentBlockHeight: currentNetworkBlockHeight,
        });

        if (indexedBlockHeight < currentNetworkBlockHeight) {
          const block = await this.networkProvider.getOneBlockByHeight(this.arithmetic.add(indexedBlockHeight, 1));

          await this.blocksCommandFactory.indexBlock(block);
        }

        if (indexedBlockHeight === currentNetworkBlockHeight) {
          // The last block was successfully indexed
          break;
        }
      } catch (error) {
        this.log.error('startIterateBlocks()', error, this.constructor.name);
      }
    }
  }

  private async aggregatesInitialization(): Promise<void> {
    // This method should run factory witch run command witch get last event aggregates,
    // and publish its. Without saving into db.
  }
}
