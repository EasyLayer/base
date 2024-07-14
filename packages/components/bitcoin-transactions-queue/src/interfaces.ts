export interface Block {
  height: bigint;
  hash: string;
  prevblockhash: string;
  tx?: Transaction[];
}

// TODO: move to provider
export interface TransactionsBatch {
  n: number;
  blockHash: string;
  blockHeight: bigint;
  blockPrevHash: string;
  tx: Omit<Transaction, 'blockHash' | 'blockHeight' | 'blockPrevHash'>[];
  isFinalBatch: boolean;
}

export interface Transaction {
  txid: string;
  hash: string;
  vin: any;
  vout: any;
  blockHash: string;
  blockHeight: bigint;
  blockPrevHash: string;
}

export interface BatchesCommandExecutor {
  indexBatch({ batch, requestId }: { batch: TransactionsBatch; requestId: string }): Promise<void>;
}
