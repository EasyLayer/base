import { Inject } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@easylayer/core/cqrs';
import { AppLogger, RuntimeTracker } from '@easylayer/components/logger';
import { Currency, Money } from '@easylayer/components/arithmetic';
import { Transactional, QueryFailedError } from '@easylayer/core/read-database';
import { BitcoinCryptoUtilsService } from '@easylayer/core/bitcoin-network-provider';
import { BlocksQueueService } from '@easylayer/core/bitcoin-blocks-queue';
import { BitcoinBalancesIndexerBlocksAddedEvent } from '@easylayer/components/domain-cqrs-components/bitcoin-balances-indexer';
import { OutputsReadService, InputsReadService, COINBASE_OUTPUT_N, COINBASE_OUTPUT_VALUE } from '../services';
import { BusinessConfig } from '../../config/business.config';

@EventsHandler(BitcoinBalancesIndexerBlocksAddedEvent)
export class BitcoinBalancesIndexerBlocksAddedEventHandler
  implements IEventHandler<BitcoinBalancesIndexerBlocksAddedEvent>
{
  constructor(
    private readonly log: AppLogger,
    private readonly businessConfig: BusinessConfig,
    private readonly outputsReadService: OutputsReadService,
    private readonly inputsReadService: InputsReadService,
    @Inject('BlocksQueueService') private readonly blocksQueueService: BlocksQueueService,
    private readonly cryptoUtilsService: BitcoinCryptoUtilsService
  ) {}

  @Transactional({ connectionName: 'balances-indexer-read' })
  @RuntimeTracker({ showMemory: true })
  async handle({ payload }: BitcoinBalancesIndexerBlocksAddedEvent) {
    try {
      const { blocks } = payload;

      const currency: Currency = {
        code: this.businessConfig.BITCOIN_BALANCES_INDEXER_CURRENCY_TICKER,
        minorUnit: this.businessConfig.BITCOIN_BALANCES_INDEXER_CURRENCY_DIGITS,
      };

      const processedOutputs = new Map<number, any[]>();
      const processedInputs = new Map<number, any[]>();

      for (const b of blocks) {
        const { height, hash } = b;

        // Подтверждаем блок
        const block = await this.blocksQueueService.confirmIndexBlock(hash);

        if (!block || block.hash !== hash) {
          throw new Error(`Wrong block ${hash}`);
        }

        const { tx } = block;

        if (!tx || tx.length === 0) {
          throw new Error(`Tx length = 0`);
        }

        for (const t of tx) {
          const txid = t.txid;

          // Обработка выходов (outputs)
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

          // Обработка входов (inputs)
          for (const vin of t.vin) {
            if (vin.coinbase) {
              // Обработка coinbase транзакции
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
              // Обычный вход
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

      // Вызов методов массовой вставки
      await this.outputsReadService.createMany(processedOutputs);
      await this.inputsReadService.createMany(processedInputs);
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
