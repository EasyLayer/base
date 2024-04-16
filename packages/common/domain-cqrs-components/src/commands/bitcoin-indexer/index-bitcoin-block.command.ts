export interface IIndexBitcoinBlockCommand {
  block: any;
  indexedBlockFromHeigh: bigint;
  indexedBlockHeigh: bigint;
}

export class IndexBitcoinBlockCommand {
  constructor(public readonly payload: IIndexBitcoinBlockCommand) {}
}
