export interface IIndexTransactionsBatchCommand {
  requestId: string;
  block: any;
  batches: any;
}

export class IndexTransactionsBatchCommand {
  constructor(public readonly payload: IIndexTransactionsBatchCommand) {}
}
