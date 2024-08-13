import { AggregateRoot } from '@easylayer/core/cqrs';
import { BitcoinNetworkProviderService, Blockchain } from '@easylayer/core/bitcoin-network-provider';
import {
  BitcoinBalancesIndexerInitializedEvent,
  BitcoinBalancesIndexerBlocksAddedEvent,
  BitcoinBalancesIndexerReorganisationStartedEvent,
  BitcoinBalancesIndexerReorganisationFinishedEvent,
  BitcoinBalancesIndexerReorganisationProcessedEvent,
} from '@easylayer/components/domain-cqrs-components/bitcoin-balances-indexer';

enum IndexerStatuses {
  AWAITING = 'awaiting',
  REORGANISATION = 'reorganisation',
}

type LightBlock = {
  height: number;
  hash: string;
  prevHash: string;
  tx: string[];
};
export class BalancesIndexer extends AggregateRoot {
  // IMPORTANT: There must be only one Indexer Aggregate in the module,
  // so we immediately give it aggregateId by which we can find it.
  public aggregateId: string = 'balances-indexer';
  public status!: IndexerStatuses;
  public chain: Blockchain = new Blockchain();

  // IMPORTANT: this method doing two things:
  // 1 - create Indexer if it's first creation
  // 2 - use already created params but still publish event
  public async init({ requestId, restoreBlocks }: { requestId: string; restoreBlocks: string[] }) {
    const status = this.status || IndexerStatuses.AWAITING;

    await this.apply(
      new BitcoinBalancesIndexerInitializedEvent({
        aggregateId: this.aggregateId,
        requestId,
        status,
        indexedHeight: this.chain.lastBlockHeight.toString(),
        restoreBlocks,
      })
    );
  }

  public async addBlocks({
    blocks,
    requestId,
    service,
    logger,
  }: {
    blocks: any;
    requestId: string;
    service: any;
    logger: any;
  }) {
    if (this.status !== IndexerStatuses.AWAITING) {
      throw new Error("addBlocks() Reorganisation hasn't finished yet");
    }

    const isValid = this.chain.validateNextBlocks(blocks);

    if (!isValid) {
      return await this.startReorganisation({
        requestId,
        service,
        logger,
        blocks: [],
      });
    }

    logger.info(
      'Balances successfull indexed',
      {
        blocksHeight: blocks[blocks.length - 1].height,
        blocksLength: blocks.length,
        txLength: blocks.reduce((result: number, item: any) => result + item.tx.length, 0),
        outputsLength: blocks.reduce(
          (result: number, item: any) => result + item.tx.reduce((r: number, i: any) => r + i.vout.length, 0),
          0
        ),
      },
      this.constructor.name
    );

    return await this.apply(
      new BitcoinBalancesIndexerBlocksAddedEvent({
        aggregateId: this.aggregateId,
        requestId,
        status: IndexerStatuses.AWAITING,
        blocks: blocks.map((block: any) => ({
          ...block,
          tx: block.tx.map((t: any) => t.txid),
        })),
      })
    );
  }

  public async processReorganisation({
    blocks,
    height,
    requestId,
    logger,
  }: {
    blocks: LightBlock[];
    height: string | number;
    requestId: string;
    logger: any;
  }): Promise<void> {
    if (this.status !== IndexerStatuses.REORGANISATION) {
      throw new Error("processReorganisation() Reorganisation hasn't started yet");
    }

    if (Number(height) > this.chain.lastBlockHeight) {
      throw new Error('Wrong block height');
    }

    // Проверяем сайз блоков и смотрим будем ли мы разбивать на несколько событий
    if (blocks.length > 100) {
      // Тут мы типо отберем часть блоков
      const blocksToProcessed = blocks;

      logger.info(
        `Blockchain continue reorganising by blocks count`,
        {
          blocksLength: blocksToProcessed.length,
        },
        this.constructor.name
      );

      return await this.apply(
        new BitcoinBalancesIndexerReorganisationProcessedEvent({
          aggregateId: this.aggregateId,
          requestId,
          // NOTE: height - height of reorganization (last correct block)
          height: height.toString(),
          blocks: blocksToProcessed,
        })
      );
    }

    logger.info(
      `Blockchain successfull reorganised to height`,
      {
        height,
      },
      this.constructor.name
    );

    return await this.apply(
      new BitcoinBalancesIndexerReorganisationFinishedEvent({
        aggregateId: this.aggregateId,
        requestId,
        status: IndexerStatuses.AWAITING,
        // NOTE: height - height of reorganization (last correct block)
        height: height.toString(),
      })
    );
  }

  public async startReorganisation({
    height,
    requestId,
    service,
    logger,
    blocks,
  }: {
    height?: number;
    requestId: string;
    service: BitcoinNetworkProviderService;
    logger: any;
    blocks: any[];
  }): Promise<void> {
    if (this.status !== IndexerStatuses.AWAITING) {
      throw new Error("reorganisation() Previous reorganisation hasn't finished yet");
    }

    // NOTE: We move from the last block in the chain and look for the last match with the provider network
    const prevHeight = height ? height : this.chain.lastBlockHeight;
    const localBlock = this.chain.findBlockByHeight(prevHeight);
    const oldBlock = await service.getOneBlockByHeight(prevHeight);

    if (!localBlock) {
      // If we haven’t found a block by height in the chain by height,
      // then this is an error,
      // we must go back all the way to the loader and try with another block
      throw new Error('Block not found in local chain');
    }

    if (oldBlock.hash === localBlock.hash && oldBlock.previousblockhash === localBlock.prevHash) {
      // Match found

      logger.info(
        'Blockchain reorganisation starting',
        {
          reorganisationHeight: localBlock.height.toString(),
          blocksLength: blocks.length,
          txLength: blocks.reduce((result: number, item: any) => result + item.tx.length, 0),
        },
        this.constructor.name
      );

      return await this.apply(
        new BitcoinBalancesIndexerReorganisationStartedEvent({
          aggregateId: this.aggregateId,
          requestId,
          status: IndexerStatuses.REORGANISATION,
          // NOTE: height - is height of reorganisation(the last height where the blocks matched)
          height: localBlock.height.toString(),
          // NOTE: blocks that need to be reorganized
          blocks,
        })
      );
    }

    // Saving blocks for publication in an event
    const newBlocks = [...blocks, localBlock];

    // Recursive check the previous block
    return this.startReorganisation({ height: prevHeight, requestId, service, logger, blocks: newBlocks });
  }

  private onBitcoinBalancesIndexerInitializedEvent({ payload }: BitcoinBalancesIndexerInitializedEvent) {
    const { aggregateId, status } = payload;
    this.aggregateId = aggregateId;
    this.status = status as IndexerStatuses;
  }

  private onBitcoinBalancesIndexerBlocksAddedEvent({ payload }: BitcoinBalancesIndexerBlocksAddedEvent) {
    const { blocks, status } = payload;

    this.status = status as IndexerStatuses;
    this.chain.addBlocks(blocks);
  }

  private onBitcoinBalancesIndexerReorganisationStartedEvent({
    payload,
  }: BitcoinBalancesIndexerReorganisationStartedEvent) {
    const { status } = payload;
    this.status = status as IndexerStatuses;
  }

  // Тут мы полностью по выстое обреаем сразу все
  // Этот метод иденпотентный
  private onBitcoinBalancesIndexerReorganisationFinishedEvent({
    payload,
  }: BitcoinBalancesIndexerReorganisationFinishedEvent) {
    const { height, status } = payload;
    this.status = status as IndexerStatuses;
    this.chain.truncateToBlock(Number(height));
  }

  // Тут мы обрежем только несколько блоков
  // Этот метод иденпотентный
  private onBitcoinBalancesIndexerReorganisationProcessedEvent({
    payload,
  }: BitcoinBalancesIndexerReorganisationProcessedEvent) {
    const { blocks } = payload;
    this.chain.truncateToBlock(Number(blocks[0].height));
  }
}
