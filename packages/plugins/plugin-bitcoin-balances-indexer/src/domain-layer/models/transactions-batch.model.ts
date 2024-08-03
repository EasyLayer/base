import { AggregateRoot } from '@easylayer/core/cqrs';
import { BitcoinCryptoUtilsService } from '@easylayer/core/bitcoin-network-provider';
import {
  BitcoinBalancesIndexerTransactionsBatchIndexedEvent,
  BitcoinBalancesIndexerTransactionsBatchSuspendedEvent,
} from '@easylayer/components/domain-cqrs-components/bitcoin-balances-indexer';

interface Vin {
  txid: string;
  vout: number;
  coinbase?: string;
}

interface Vout {
  value: number;
  n: number;
  scriptPubKey: {
    hex: string;
    type: string;
    addresses?: string[];
  };
}

interface Transaction {
  txid: string;
  vin: Vin[];
  vout: Vout[];
}

interface Output {
  address: string;
  value: number;
}

interface Input {
  txid: string | null; // this is the transaction with which the output was spent
  vout: number | null;
  coinbase: string | null;
}

type N = number; // Vout.n
type TxId = string; // tx.txid
type Index = number;

interface BatchTransaction {
  outputs: Map<N, Output>;
  inputs: Input[];
}

type TransactionsMap = Map<TxId, BatchTransaction>;

interface Batch {
  // IMPORTANT: 'tx' has Map structure to find transactions with hashes present in block.tx (O(1))
  tx: TransactionsMap;
  // IMPORTANT: 'n' - this is the batch's number in the block.
  // [0, infinite]. 0 - means the first batch in the block
  n: Index;
  isFinalBatch: boolean;
}

enum BatchStatuses {
  INDEXED = 'indexed',
  SUSPENDED = 'suspended',
}

export class TransactionsBatch extends AggregateRoot {
  public aggregateId!: string; // uuid
  public batch!: Batch;
  public blockHeight!: number; // TODO: don’t have to store it in the model, but only publish it in events
  public status!: BatchStatuses;

  public async index({
    service,
    aggregateId,
    requestId,
    transactions,
    blockHeight,
    n,
    isFinalBatch,
  }: {
    service: BitcoinCryptoUtilsService;
    aggregateId: string;
    requestId: string;
    transactions: Transaction[];
    blockHeight: number;
    n: number;
    isFinalBatch: boolean;
  }) {
    const tx: TransactionsMap = new Map();

    for (const item of transactions) {
      const { vin, vout, txid } = item;

      const outputs = new Map();
      for (const v of vout) {
        const address = service.getAddressFromScriptPubKey(v.scriptPubKey);
        outputs.set(v.n, { address, value: v.value });
      }

      const inputs = vin.map((inputItem: any) => ({
        txid: inputItem.coinbase ? null : inputItem.txid,
        vout: inputItem.coinbase ? null : inputItem.vout,
        coinbase: inputItem.coinbase ? inputItem.coinbase : null,
      }));

      tx.set(txid, {
        outputs,
        inputs,
      });
    }

    const serializedTx = Object.fromEntries(
      Array.from(tx.entries()).map(([key, value]) => [
        key,
        {
          ...value,
          outputs: Object.fromEntries(value.outputs),
        },
      ])
    );

    await this.apply(
      new BitcoinBalancesIndexerTransactionsBatchIndexedEvent({
        aggregateId,
        requestId,
        blockHeight: blockHeight.toString(),
        batch: {
          tx: serializedTx,
          n,
          isFinalBatch,
        }, // TODO: serialize
        status: BatchStatuses.INDEXED,
      })
    );
  }

  public async suspend({ requestId }: { requestId: string }) {
    await this.apply(
      new BitcoinBalancesIndexerTransactionsBatchSuspendedEvent({
        aggregateId: this.aggregateId,
        requestId,
        batch: this.batch,
        status: BatchStatuses.SUSPENDED,
      })
    );
  }

  private onBitcoinBalancesIndexerTransactionsBatchIndexedEvent({
    payload,
  }: BitcoinBalancesIndexerTransactionsBatchIndexedEvent) {
    const { aggregateId, status, batch, blockHeight } = payload;
    const { tx, n, isFinalBatch } = batch;

    const txMap: TransactionsMap = new Map(
      Object.entries(tx).map(([txid, transaction]: [string, any]) => [
        txid,
        {
          inputs: transaction.inputs,
          outputs: new Map(Object.entries(transaction.outputs).map(([key, value]) => [Number(key), value as Output])),
        },
      ])
    );

    this.aggregateId = aggregateId;
    this.blockHeight = Number(blockHeight);
    this.status = status as BatchStatuses;
    this.batch = {
      n,
      isFinalBatch,
      tx: txMap,
    };
  }

  private onBitcoinBalancesIndexerTransactionsBatchSuspendedEvent({
    payload,
  }: BitcoinBalancesIndexerTransactionsBatchSuspendedEvent) {
    const { status } = payload;
    this.status = status as BatchStatuses;
  }
}
