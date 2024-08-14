import { Inject } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@easylayer/core/cqrs';
import { RuntimeTracker } from '@easylayer/components/logger';
import { Currency, Money } from '@easylayer/components/arithmetic';
import { Transactional, QueryFailedError } from '@easylayer/core/read-database';
import { BlocksQueueService } from '@easylayer/core/bitcoin-blocks-queue';
import { BitcoinCryptoUtilsService, BitcoinNetworkProviderService } from '@easylayer/core/bitcoin-network-provider';
import { BitcoinBalancesIndexerInitializedEvent } from '@easylayer/components/domain-cqrs-components/bitcoin-balances-indexer';
import { OutputsReadService, InputsReadService, COINBASE_OUTPUT_N, COINBASE_OUTPUT_VALUE } from '../services';
import { BusinessConfig } from '../../config/business.config';

@EventsHandler(BitcoinBalancesIndexerInitializedEvent)
export class BitcoinBalancesIndexerInitializedEventHandler
  implements IEventHandler<BitcoinBalancesIndexerInitializedEvent>
{
  constructor(
    private readonly businessConfig: BusinessConfig,
    private readonly outputsReadService: OutputsReadService,
    private readonly inputsReadService: InputsReadService,
    private readonly cryptoUtilsService: BitcoinCryptoUtilsService,
    private readonly networkProviderService: BitcoinNetworkProviderService,
    @Inject('BlocksQueueService') private readonly blocksQueueService: BlocksQueueService
  ) {}

  @Transactional({ connectionName: 'balances-indexer-views' })
  @RuntimeTracker({ showMemory: false })
  async handle({ payload }: BitcoinBalancesIndexerInitializedEvent) {
    try {
      const { restoreBlocks, indexedHeight } = payload;

      const currency: Currency = {
        code: this.businessConfig.BITCOIN_BALANCES_INDEXER_CURRENCY_TICKER,
        minorUnit: this.businessConfig.BITCOIN_BALANCES_INDEXER_CURRENCY_DIGITS,
      };

      const processedOutputs = new Map<number, any[]>();
      const processedInputs = new Map<number, any[]>();

      for (const hash of restoreBlocks) {
        // Fetch block with tx from provider
        const block = await this.networkProviderService.getOneBlockByHash(hash, 2);

        const { tx, height } = block;

        if (!tx || tx.length === 0) {
          throw new Error(`Tx length = 0`);
        }

        for (const t of tx) {
          const txid = t.txid;

          for (const vout of t.vout) {
            const address = this.cryptoUtilsService.getAddressFromScriptPubKey(vout.scriptPubKey);
            const value = Money.fromDecimal(vout.value, currency).toCents();

            if (!processedOutputs.has(height)) {
              processedOutputs.set(height, []);
            }

            processedOutputs.get(height)!.push({
              txid,
              address,
              value,
              n: vout.n,
            });
          }

          for (const vin of t.vin) {
            if (vin.coinbase) {
              // Processing coinbase transaction
              if (!processedOutputs.has(height)) {
                processedOutputs.set(height, []);
              }

              if (!processedInputs.has(height)) {
                processedInputs.set(height, []);
              }

              processedOutputs.get(height)!.push({
                txid,
                address: null,
                value: COINBASE_OUTPUT_VALUE,
                n: COINBASE_OUTPUT_N,
                coinbase: vin.coinbase,
              });

              processedInputs.get(height)!.push({
                txid: null,
                outputTxId: txid,
                outputN: COINBASE_OUTPUT_N,
              });
            } else {
              // Normal input
              if (!processedInputs.has(height)) {
                processedInputs.set(height, []);
              }

              processedInputs.get(height)!.push({
                txid,
                outputTxId: vin.txid,
                outputN: vin.vout,
              });
            }
          }
        }
      }

      if (processedOutputs.size > 0) {
        await this.outputsReadService.createMany(processedOutputs);

        if (processedInputs.size > 0) {
          await this.inputsReadService.createMany(processedInputs);
        }
      }

      // IMPORTANT: We will only start loading to the blocks queue after the restoration of the Read State
      // TODO: move it from here
      this.blocksQueueService.start(indexedHeight);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const driverError = error.driverError;
        if (driverError.code === 'SQLITE_CONSTRAINT') {
          throw new Error(driverError.message);
        }
        if (driverError.code === '23505') {
          throw new Error(driverError.detail);
        }
      }

      throw error;
    }
  }
}
