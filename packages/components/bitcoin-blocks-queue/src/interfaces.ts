export interface TransctionsList {
  blockHash: string;
  blockHeight: bigint;
  transactions: Transaction[];
}

export interface TransactionsPage {
  page: number;
  blockHash: string;
  blockHeight: bigint;
  transactions: Transaction[];
  lastPage: boolean;
}

export interface TransactionsBatch {
  index: number;
  blockHash: string;
  blockHeight: bigint;
  transactions: Transaction[];
  isFinalBatch: boolean;
}
export interface Transaction {
  txid: string;
  hash: string;
  vin: any;
  vout: any;
}
// TODO: move to provider
export interface Block {
  height: bigint;
  hash: string;
  tx?: Transaction[];
}

export interface BlocksCommandExecutor {
  indexBlock({ block, requestId }: { block: Block; requestId: string }): Promise<void>;
}
