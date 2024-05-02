export interface IBitcoinUpdateDepositCommand {
  aggregateId: string;
  block: any;
}

export class BitcoinUpdateDepositCommand {
  constructor(public readonly payload: IBitcoinUpdateDepositCommand) {}
}
