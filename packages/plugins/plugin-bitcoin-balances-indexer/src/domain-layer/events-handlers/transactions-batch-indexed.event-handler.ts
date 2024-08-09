import { EventsHandler, IEventHandler } from '@easylayer/core/cqrs';
import { AppLogger, RuntimeTracker } from '@easylayer/components/logger';
import { Currency, Money } from '@easylayer/components/arithmetic';
import { Transactional } from '@easylayer/core/read-database';
import { BitcoinBalancesIndexerTransactionsBatchIndexedEvent } from '@easylayer/components/domain-cqrs-components/bitcoin-balances-indexer';
import { OutputsReadService, InputsReadService, COINBASE_OUTPUT_N, COINBASE_OUTPUT_VALUE } from '../services';
import { BusinessConfig } from '../../config/business.config';

@EventsHandler(BitcoinBalancesIndexerTransactionsBatchIndexedEvent)
export class BitcoinBalancesIndexerTransactionsBatchIndexedEventHandler
  implements IEventHandler<BitcoinBalancesIndexerTransactionsBatchIndexedEvent>
{
  constructor(
    private readonly log: AppLogger,
    private readonly businessConfig: BusinessConfig,
    private readonly outputsReadService: OutputsReadService,
    private readonly inputsReadService: InputsReadService
  ) {}

  @Transactional({ connectionName: 'balances-indexer-read' })
  @RuntimeTracker({ showMemory: true })
  async handle({ payload }: BitcoinBalancesIndexerTransactionsBatchIndexedEvent) {
    try {
      this.log.debug('handle()', payload, this.constructor.name);

      const { blockHeight, batch } = payload;
      const { tx } = batch;

      const processedOutputs: any[] = [];
      const processedInputs: any[] = [];

      const currency: Currency = {
        code: this.businessConfig.BITCOIN_BALANCES_INDEXER_CURRENCY_TICKER,
        minorUnit: this.businessConfig.BITCOIN_BALANCES_INDEXER_CURRENCY_DIGITS,
      };

      Object.entries(tx).forEach(([txid, item]: any) => {
        const { inputs, outputs } = item;

        Object.entries(outputs).forEach(([n, item]: any) => {
          // console.log('1', item.value);
          const moneyInstance = Money.fromDecimal(item.value, currency);
          const value = moneyInstance.toCents();
          // console.log('2', value);
          processedOutputs.push({
            txid,
            address: item.address,
            value,
            n,
          });
        });

        inputs.forEach((item: any) => {
          if (item.coinbase) {
            processedOutputs.push({
              txid,
              address: null,
              value: COINBASE_OUTPUT_VALUE,
              n: COINBASE_OUTPUT_N,
              coinbase: item.coinbase,
            });
            processedInputs.push({
              txid: null,
              outputTxId: txid, // tx.txid
              outputN: COINBASE_OUTPUT_N,
            });
          } else {
            processedInputs.push({
              txid, // tx.txid
              outputTxId: item.txid, // tx.vin.txid
              outputN: item.vout, // tx.vin.vout
            });
          }
        });
      });

      await this.outputsReadService.createMany({
        blockHeight,
        outputs: processedOutputs,
      });

      await this.inputsReadService.createMany({ inputs: processedInputs });
    } catch (error) {
      this.log.error('handle()', error, this.constructor.name);
      throw error;
    }
  }
}
