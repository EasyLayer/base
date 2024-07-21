import { EventsHandler, IEventHandler } from '@easylayer/cqrs';
import { AppLogger } from '@easylayer/logger';
import { Transactional } from '@easylayer/read-database';
import { BitcoinBalancesIndexerTransactionsBatchIndexedEvent } from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';
import { OutputsReadService, InputsReadService, COINBASE_OUTPUT_N, COINBASE_OUTPUT_VALUE } from '../services';

@EventsHandler(BitcoinBalancesIndexerTransactionsBatchIndexedEvent)
export class BitcoinBalancesIndexerTransactionsBatchIndexedEventHandler
  implements IEventHandler<BitcoinBalancesIndexerTransactionsBatchIndexedEvent>
{
  constructor(
    private readonly log: AppLogger,
    private readonly outputsReadService: OutputsReadService,
    private readonly inputsReadService: InputsReadService
  ) {}

  @Transactional({ connectionName: 'balances-indexer-read' })
  async handle({ payload }: BitcoinBalancesIndexerTransactionsBatchIndexedEvent) {
    try {
      this.log.debug('handle()', payload, this.constructor.name);

      const { blockHeight, batch } = payload;
      const { tx } = batch;

      const processedOutputs: any[] = [];
      const processedInputs: any[] = [];

      Object.entries(tx).forEach(([txid, item]: any) => {
        const { inputs, outputs } = item;

        Object.entries(outputs).forEach(([n, item]: any) => {
          processedOutputs.push({
            txid,
            address: item.addresses[0] || null, // TODO: decide what to do if there are multiple addresses
            value: item.value,
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
      this.log.error('handle()', { error }, this.constructor.name);
      throw error;
    }
  }
}
