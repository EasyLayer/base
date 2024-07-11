export interface IIndexTransactionsCommand {
  batch: any;
  requestId: string;
}

export class IndexTransactionsCommand {
  constructor(public readonly payload: IIndexTransactionsCommand) {}
}
