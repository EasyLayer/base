export interface IBitcoinParseBlockCommand {
  block: any;
}

export class BitcoinParseBlockCommand {
  constructor(public readonly payload: IBitcoinParseBlockCommand) {}
}
