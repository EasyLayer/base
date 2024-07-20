import { AggregateRoot } from '@easylayer/cqrs';
import {
  BitcoinBalancesIndexerTransactionIndexedEvent,
  // BitcoinBalancesIndexerTransactionOutputSpentEvent,
  // BitcoinBalancesIndexerTransactionOutputUnspentEvent,
  BitcoinBalancesIndexerTransactionDeletedEvent,
} from '@easylayer/domain-cqrs-components/bitcoin-balances-indexer';

interface Vout {
  addresses: string[];
  value: number;
}

interface Vin {
  txid: string | null; // this is the transaction with which the output was spent
  vout: number | null;
  coinbase: string | null;
}

type N = number; // Vout.n
type Outputs = Map<N, Vout>;
type Inputs = Vin[];

export class Transaction extends AggregateRoot {
  public aggregateId!: string; // uuid
  public outputs!: Outputs;
  public inputs!: Inputs;
  public status!: string;

  // This is create aggregate method
  // NOTE: this method indexes in one event all transaction outputs & inputs
  public async index({
    aggregateId,
    vout,
    vin,
    requestId,
    blockHeight,
    blockHash,
  }: {
    aggregateId: string;
    vout: any; // vout object
    vin: any; // vin object
    requestId: string;
    blockHeight: number;
    blockHash: string;
  }) {
    const outputs: Outputs = new Map(
      vout.map((item: any) => [item.n, { addresses: item.scriptPubKey.addresses, value: item.value }])
    );

    const inputs: Inputs = vin.map((item: any) => ({
      txid: item.coinbase ? null : item.txid,
      vout: item.coinbase ? null : item.vout,
      coinbase: item.coinbase ? item.coinbase : null,
    }));

    await this.apply(
      new BitcoinBalancesIndexerTransactionIndexedEvent({
        aggregateId,
        outputs: Object.fromEntries(outputs),
        inputs,
        requestId,
        status: 'completed',
        // We send block data by event but do not store it in the aggregate state.
        blockHeight: String(blockHeight),
        blockHash,
      })
    );
  }

  // // NOTE: This method spends one output of this transaction
  // public async spend({
  //   aggregateId,
  //   voutIndex,
  //   requestId,
  // }: {
  //   aggregateId: string;
  //   voutIndex: number;
  //   requestId: string;
  // }) {
  //   await this.apply(
  //     new BitcoinBalancesIndexerTransactionOutputSpentEvent({
  //       aggregateId,
  //       voutIndex,
  //       requestId,
  //     })
  //   );
  // }

  // public async unspent({
  //   aggregateId,
  //   voutIndex,
  //   requestId,
  // }: {
  //   aggregateId: string;
  //   voutIndex: number;
  //   requestId: string;
  // }) {
  //   await this.apply(
  //     new BitcoinBalancesIndexerTransactionOutputUnspentEvent({
  //       aggregateId,
  //       voutIndex,
  //       requestId,
  //     })
  //   );
  // }

  public async delete({
    aggregateId,
    vout,
    requestId,
    blockHeight,
    blockHash,
  }: {
    aggregateId: string;
    vout: any;
    requestId: string;
    blockHeight: number;
    blockHash: string;
  }) {
    const outputsIndexes = vout.map((item: any) => item.n);

    await this.apply(
      new BitcoinBalancesIndexerTransactionDeletedEvent({
        aggregateId,
        outputsIndexes,
        requestId,
        status: 'deleted',
        // We send block data by event but do not store it in the aggregate state.
        blockHeight: String(blockHeight),
        blockHash,
      })
    );
  }

  public onBitcoinBalancesIndexerTransactionIndexedEvent({ payload }: BitcoinBalancesIndexerTransactionIndexedEvent) {
    const { aggregateId, outputs, inputs, status } = payload;
    this.aggregateId = aggregateId;
    this.status = status;
    this.inputs = inputs;
    this.outputs = new Map();
    const outputsArr = new Map(Object.entries(outputs));

    outputsArr.forEach((item: any) => {
      this.outputs.set(item.n, {
        value: item.value,
        addresses: item.addresses,
      });
    });
  }

  // public onBitcoinBalancesIndexerTransactionOutputSpentEvent({
  //   payload,
  // }: BitcoinBalancesIndexerTransactionOutputSpentEvent) {
  //   const { voutIndex } = payload;
  //   const output = this.outputs.get(voutIndex);
  //   if (output) {
  //     // So we found output by index
  //     output.spent = true;
  //     this.outputs.set(voutIndex, output);
  //   }
  // }

  // public onBitcoinBalancesIndexerTransactionOutputUnspentEvent({
  //   payload,
  // }: BitcoinBalancesIndexerTransactionOutputUnspentEvent) {
  //   const { voutIndex } = payload;
  //   const output = this.outputs.get(voutIndex);
  //   if (output) {
  //     // So we found output by index
  //     output.spent = false;
  //     this.outputs.set(voutIndex, output);
  //   }
  // }

  public onBitcoinBalancesIndexerTransactionDeletedEvent({ payload }: BitcoinBalancesIndexerTransactionDeletedEvent) {
    const { status, outputsIndexes } = payload;
    this.status = status;

    outputsIndexes.forEach((n: number) => {
      this.outputs.delete(n);
    });
  }
}
