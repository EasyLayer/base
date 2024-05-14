export interface IIndexTransactionsBatchCommand {
  requestId: string;
  block: any;
}

export class IndexTransactionsBatchCommand {
  constructor(public readonly payload: IIndexTransactionsBatchCommand) {}
}
