export interface IIndexTransactionsBatchCommand {
  requestId: string;
  block: any;
  batches: Map<string, string>;
}

export class IndexTransactionsBatchCommand {
  constructor(public readonly payload: IIndexTransactionsBatchCommand) {}
}
