export interface IIndexBlockCommand {
  block: any;
  indexedBlockFromHeigh: bigint;
  indexedBlockHeigh: bigint;
}

export class IndexBlockCommand {
  constructor(public readonly payload: IIndexBlockCommand) {}
}
