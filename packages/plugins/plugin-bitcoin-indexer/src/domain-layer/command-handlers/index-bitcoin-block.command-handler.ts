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
import { BlockModelFactoryService, TransactionsBatchModelFactoryService, NetworkModelFactoryService } from '../services';

@CommandHandler(IndexBlockCommand)
export class IndexBlockCommandHandler implements ICommandHandler<IndexBlockCommand> {
  constructor(
    private readonly log: AppLogger,
    private readonly modelFactory: BlockModelFactoryService,
    private readonly networkModelFactory: NetworkModelFactoryService,
    private readonly batchModelFactory: TransactionsBatchModelFactoryService,
    private readonly networkProviderService: BitcoinNetworkProviderService,
    private readonly networkEventStore: EventStoreRepository<Network>,
    private readonly blocksEventStore: EventStoreRepository<Block>,
    private readonly batchesEventStore: EventStoreRepository<TransactionsBatch>,
  ) {}

  @Transactional({ connectionName: 'indexer-write' })
  async execute({ payload }: IndexBlockCommand) {
    try {
      this.log.debug('execute()', payload, this.constructor.name);

      const { block, requestId } = payload;
      const { tx, ...lightweightBlock } = block;
      const { height, hash, previousblockhash } = lightweightBlock;

      const networkModel: Network = await this.networkModelFactory.initByExtraModel();

      /* Check reorganisation */
      if (!networkModel.chain.addBlock(height, hash, previousblockhash)) {
        await networkModel.reorganisation({ height, requestId, service: this.networkProviderService });
        await this.networkEventStore.save(networkModel);
        await networkModel.commit();
        this.log.debug(`Network reorganisation started`, {}, this.constructor.name);
        return;
      }

      await networkModel.addBlock({ block: { height, hash, previousblockhash }, requestId });

      //save network into db
      await this.networkEventStore.save(networkModel);

      // { <aggregateId>:<status> }
      const batches: Map<string, string> = new Map();

      // TODO: move into env
      const MAX_TRANSACTIONS_PER_BATCH = 100;

      /* Create transactions batches */
      while (tx.length > 0) {
        // Extract a batch of transactions, removing them from the copy of the array
        // IMPORTANT: transactions in the block are arranged in order
        // when splitting into batches we must follow this order!!
        const transactionSlice = tx.splice(0, MAX_TRANSACTIONS_PER_BATCH);

        // We create a Map to store transactions with a key - the transaction hash
        // TODO: add type
        const transactionsMap: Map<string, any> = new Map(transactionSlice.map((transaction: { hash: string, inputs: any, outputs: any }) => [
          transaction.hash, {
            inputs: transaction.inputs,
            outputs: transaction.outputs
          }
        ]));

        const transactionBatch: TransactionsBatch = this.batchModelFactory.createNewModel();

        await transactionBatch.create({
          aggregateId: uuidv4(),
          transactions: transactionsMap,
          blockHeight: height,
          blockHash: hash
        });

        // save into db
        await this.batchesEventStore.save(transactionBatch);

        // Set batches with status created into variable
        batches.set(transactionBatch.aggregateId, 'created');
      }

      // TODO: process the option of indexing the first batch of transactions immediately

      /* Create a NEW block model */
      // IMPORTANT: If a block with the current height already exists, 
      // we will overwrite it with this state
      const blockModel: Block = this.modelFactory.createNewModel();

      await blockModel.index({
        aggregateId: height,
        block: lightweightBlock,
        batches,
        requestId
      });

      //save block into db
      await this.blocksEventStore.save(blockModel);

      await networkModel.commit();
      await blockModel.commit();

      this.log.debug('Block index started', { height, hash, previousblockhash, ...lightweightBlock }, this.constructor.name);
    } catch (error) {
      this.log.error('execute()', error, this.constructor.name);
      throw error;
    }
  }
}
