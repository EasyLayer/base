export interface Block {
  height: bigint;
  hash: string;
  prevblockhash: string | null;
  tx?: Transaction[];
}

// TODO: move to provider
export interface TransactionsBatch {
  n: number;
  blockHash: string;
  blockHeight: bigint;
  prevBlockHash: string | null;
  tx: Omit<Transaction, 'blockHash' | 'blockHeight' | 'prevBlockHash'>[];
  isFinalBatch: boolean;
}

export interface Transaction {
  txid: string;
  hash: string;
  vin: any;
  vout: any;
  blockHash: string;
  blockHeight: bigint;
  prevBlockHash: string;
}

export interface BatchesCommandExecutor {
  indexBatch({ batch, requestId }: { batch: TransactionsBatch; requestId: string }): Promise<void>;
}
