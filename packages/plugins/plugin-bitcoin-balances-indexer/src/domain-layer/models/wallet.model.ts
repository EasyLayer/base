import { AggregateRoot } from '@easylayer/cqrs';

interface Vin {
  txid: string;
  vout: number;
  scriptSig: string;
}

interface Vout {
  value: number;
  n: number;
  scriptPubKey: {
    addresses: string[];
  };
}

export interface LightweightTransaction {
  txid: string;
  hash: string;
  vin: Vin;
  vout: Vout;
}

export class Wallet extends AggregateRoot {
  public aggregateId!: string; // address wallet
  public balance!: bigint;
  public batchesIds!: Map<string, bigint> // Map<batchId, amount> - это для того чтобы откатить баланс всего батча
  // public transactionsIds!: Map<string, any>; // Map<txid><any> + может где то batch еще, хотя batch можно в network контролировать
  public publicKey!: string;
  public utxos!: Map<string, Vout>;
  public utxo!: Map<string, Vout>;
  // // эти два или один из них параметра нужны чтобы мы понимали на каком блоке мы последний раз обновили баланс
  // // и понимали он подтвержден или нет
  // public lastBlockHeight!: bigint;
  // public lastBlockHash!: string;



  // TODO: сделать чтобы мы создавали или новый кошелек или старый использовали, 
  // по сути мы знаем его aggregateId так что норм
  public async index({
    aggregateId,
    requestId,
    transactions,
    blockHeight,
    blockHash
  }: {
    aggregateId: string;
    requestId: string,
    transactions: Map<string, any>;
    blockHeight: bigint;
    blockHash: string;
  }) {

    // await this.apply();
  }

  // private onBitcoinTransactionsBatchCreatedEvent({ payload }: BitcoinTransactionsBatchCreatedEvent) {
  //   const { aggregateId, transactions, blockHeight, blockHash, status } = payload;
  //   this.aggregateId = aggregateId;
  //   this.blockHeight = BigInt(blockHeight);
  //   this.transactions = new Map(Object.entries(transactions));
  //   this.blockHash = blockHash;
  //   this.status = status;
  // }
}
