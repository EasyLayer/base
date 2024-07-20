import { EventsHandler, IEventHandler } from '@easylayer/cqrs';
import { AppLogger } from '@easylayer/logger';
import { Transactional } from '@easylayer/read-database';
import { BitcoinBalancesIndexerTransactionIndexedEvent } from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';
import { OutputsReadService, InputsReadService, COINBASE_OUTPUT_N, COINBASE_OUTPUT_VALUE } from '../services';

@EventsHandler(BitcoinBalancesIndexerTransactionIndexedEvent)
export class BitcoinBalancesIndexerTransactionIndexedEventHandler
  implements IEventHandler<BitcoinBalancesIndexerTransactionIndexedEvent>
{
  constructor(
    private readonly log: AppLogger,
    private readonly outputsReadService: OutputsReadService,
    private readonly inputsReadService: InputsReadService
  ) {}

  @Transactional({ connectionName: 'balances-indexer-read' })
  async handle({ payload }: BitcoinBalancesIndexerTransactionIndexedEvent) {
    try {
      this.log.debug('handle()', payload, this.constructor.name);

      const { aggregateId, blockHeight, outputs, inputs } = payload;

      const processedOutputs: any[] = [];
      const processedInputs: any[] = [];

      Object.entries(outputs).forEach(([n, item]: any) => {
        processedOutputs.push({
          txid: aggregateId,
          address: item.addresses[0] || null, // TODO: decide what to do if there are multiple addresses
          value: item.value,
          n,
        });
      });

      inputs.forEach((item: any) => {
        if (item.coinbase) {
          processedOutputs.push({
            txid: aggregateId,
            address: null,
            value: COINBASE_OUTPUT_VALUE,
            n: COINBASE_OUTPUT_N,
            coinbase: item.coinbase,
          });
          processedInputs.push({
            txid: null,
            outputTxId: aggregateId, // tx.txid
            outputN: COINBASE_OUTPUT_N,
          });
        } else {
          processedInputs.push({
            txid: aggregateId, // tx.txid
            outputTxId: item.txid, // tx.vin.txid
            outputN: item.vout, // tx.vin.vout
          });
        }
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
