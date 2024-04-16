export interface IIndexBitcoinTransactionsBatchCommand {
  transactionsPoolId: string;
  blockId: string;
}

export class IndexBitcoinTransactionsBatchCommand {
  constructor(public readonly payload: IIndexBitcoinTransactionsBatchCommand) {}
}
