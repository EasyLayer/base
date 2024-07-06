export interface IInitIndexerCommand {
  requestId: string;
  startHeight: bigint;
  maxHeight: bigint;
}

export class InitIndexerCommand {
  constructor(public readonly payload: IInitIndexerCommand) {}
}
