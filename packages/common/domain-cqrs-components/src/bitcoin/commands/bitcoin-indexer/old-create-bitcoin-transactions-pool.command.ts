export interface ICreateBitcoinTransactionsPoolCommand {
  blockId: string;
}

export class CreateBitcoinTransactionsPoolCommand {
  constructor(public readonly payload: ICreateBitcoinTransactionsPoolCommand) {}
}
