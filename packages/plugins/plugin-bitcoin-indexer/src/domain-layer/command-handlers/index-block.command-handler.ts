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

      // TODO: For this command, you need to get a block in which only hashes will be transferred.
      const { tx, ...lightweightBlock } = block; 
      const { height, hash, previousblockhash } = lightweightBlock;

      // TODO: Network should be in snapshot cache
      const networkModel: Network = await this.networkModelFactory.initModel();

      this.log.debug('Init Network model', { aggregateId: networkModel.aggregateId }, this.constructor.name);

      /* Check reorganisation */
      if (!networkModel.chain.validateNextBlock(height, previousblockhash)) {
        await networkModel.reorganisation({ height, requestId, service: this.networkProviderService });
        await this.eventStore.save(networkModel);
        await networkModel.commit();
        this.log.debug(`Network reorganisation started`, {}, this.constructor.name);
        return;
      }

      await networkModel.addBlock({ block: { height, hash, previousblockhash }, requestId });
      this.log.debug('Network added new block', { aggregateId: networkModel.aggregateId, block: { height, hash, previousblockhash } }, this.constructor.name);
      // TODO: move into env
      const MAX_TRANSACTIONS_PER_BATCH = 1000;

      const batches = [];

      this.log.info('Transactions lenght', { length: tx.length }, this.constructor.name);

      /* Create transactions batches */
      while (tx.length > 0) {
        // Extract a batch of transactions, removing them from the copy of the array
        // IMPORTANT: transactions in the block are arranged in order
        // when splitting into batches we must follow this order!!
        const transactionSlice = tx.splice(0, MAX_TRANSACTIONS_PER_BATCH);

        // We create a Map to store transactions with a key - the transaction hash
        // TODO: add type
        // IMPORTANT: Here we just get the hash and put them in the list of non-indexed transactions.
        // Then, when we work with a specific batch, 
        // we take specific transactions from the queue (by block) and work with them.
        const transactionsMap: Map<string, any> = new Map(transactionSlice.map((transaction: { hash: string }) => [
          transaction.hash, null
        ]));

        const transactionBatch: TransactionsBatch = this.batchModelFactory.createNewModel();
        
        await transactionBatch.create({
          aggregateId: uuidv4(),
          requestId,
          transactions: transactionsMap,
          blockHeight: height,
          blockHash: hash
        });

        batches.push(transactionBatch);
      }

      this.log.info('Batches lenght', { length: batches.length }, this.constructor.name);


      if (batches.length === 1) {
        // TODO: process the option of indexing the first batch of transactions immediately
      }

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
        // NOTE: JS treats the 0 heigth as false, so we call it 'genesis'
        aggregateId: height || 'genesis',
        block: lightweightBlock,
        batches: batchesMap,
        requestId
      });

      await this.eventStore.save([...batches, networkModel, blockModel]);

      await networkModel.commit();
      await blockModel.commit();

      this.log.debug('Block index started', { block: lightweightBlock }, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
