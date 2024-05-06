import { v4 as uuidv4 } from 'uuid';
import { CommandHandler, ICommandHandler } from '@easylayer/cqrs';
import { Transactional } from '@easylayer/eventstore/transactional-hooks';
import { IndexBlockCommand } from '@easylayer/domain-cqrs-components/bitcoin';
import { AppLogger } from '@easylayer/logger';
import {
  BitcoinNetworkProviderService,
} from '@easylayer/bitcoin-network-provider';
import { EventStoreRepository } from '@easylayer/eventstore';
import { Block } from '../models/block.model';
import { Network } from '../models/network.model';
import { TransactionsBatch } from '../models/transactions-batch';
import {
  BlockModelFactoryService,
  TransactionsBatchModelFactoryService,
  NetworkModelFactoryService
} from '../services';

@CommandHandler(IndexBlockCommand)
export class IndexBlockCommandHandler implements ICommandHandler<IndexBlockCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly modelFactory: BlockModelFactoryService,
    private readonly networkModelFactory: NetworkModelFactoryService,
    private readonly batchModelFactory: TransactionsBatchModelFactoryService,
    private readonly networkProviderService: BitcoinNetworkProviderService,
    private readonly eventStore: EventStoreRepository,
  ) {}

  @Transactional({ connectionName: 'indexer-write' })
  async execute({ payload }: IndexBlockCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { block, requestId } = payload;
      const { tx, ...lightweightBlock } = block; // Давай для этой команды я сделаю достать блок у которого транзы будут только хэши.
      const { height, hash, previousblockhash } = lightweightBlock;

      // TODO: Network should be in snapshot cache
      const networkModel: Network = await this.networkModelFactory.initByExtraModel();

      /* Check reorganisation */
      if (!networkModel.chain.addBlock(height, hash, previousblockhash)) {
        await networkModel.reorganisation({ height, requestId, service: this.networkProviderService });
        await this.eventStore.save(networkModel);
        await networkModel.commit();
        this.log.debug(`Network reorganisation started`, {}, this.constructor.name);
        return;
      }

      await networkModel.addBlock({ block: { height, hash, previousblockhash }, requestId });

      // TODO: move into env
      const MAX_TRANSACTIONS_PER_BATCH = 1000;

      const batches = [];

      /* Create transactions batches */
      while (tx.length > 0) {
        // Extract a batch of transactions, removing them from the copy of the array
        // IMPORTANT: transactions in the block are arranged in order
        // when splitting into batches we must follow this order!!
        const transactionSlice = tx.splice(0, MAX_TRANSACTIONS_PER_BATCH);

        // We create a Map to store transactions with a key - the transaction hash
        // TODO: add type
        // TODO: мы тут только hash дотсаем и кладем их в список не проиндексированных транз. 
        // ПОтом когда мы будем брать конкретный батч, мы достаем с очереди по блоку конкретные транзы и работаем с ними. 
        const transactionsMap: Map<string, any> = new Map(transactionSlice.map((transaction: { hash: string }) => [
          transaction.hash, null
        ]));

        const transactionBatch: TransactionsBatch = this.batchModelFactory.createNewModel();

        await transactionBatch.create({
          aggregateId: uuidv4(),
          transactions: transactionsMap,
          blockHeight: height,
          blockHash: hash
        });

        // Set batches with status created into variable
        // batches.set(transactionBatch.aggregateId, 'created');
        batches.push(transactionBatch);
      }

      // TODO: process the option of indexing the first batch of transactions immediately

      /* Create a NEW block model */
      // IMPORTANT: If a block with the current height already exists, 
      // we will overwrite it with this state
      const blockModel: Block = this.modelFactory.createNewModel();

      // { <aggregateId>:<status> }
      const batchesMap: Map<string, string> = new Map();
      batches.forEach(batch => {
        batchesMap.set(batch.aggregateId, 'created');
      });

      await blockModel.index({
        aggregateId: height,
        block: lightweightBlock,
        batches: batchesMap,
        requestId
      });

      await this.eventStore.save([...batches, networkModel, blockModel]);

      await networkModel.commit();
      await blockModel.commit();

      this.log.debug('Block index started', { height, hash, previousblockhash, ...lightweightBlock }, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
