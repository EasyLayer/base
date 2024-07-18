export interface Block {
  height: number;
  hash: string;
  prevblockhash: string | null;
  tx?: Transaction[];
}

// TODO: move to provider
export interface TransactionsBatch {
  n: number;
  blockHash: string;
  blockHeight: number;
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
  blockHeight: number;
  prevBlockHash: string;
}

export interface BatchesCommandExecutor {
  indexBatch({ batch, requestId }: { batch: TransactionsBatch; requestId: string }): Promise<void>;
}
