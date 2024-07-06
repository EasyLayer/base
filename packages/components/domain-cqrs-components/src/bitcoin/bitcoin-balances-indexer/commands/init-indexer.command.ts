export interface IInitIndexerCommand {
  requestId: string;
  startHeight: bigint;
}

export class InitIndexerCommand {
  constructor(public readonly payload: IInitIndexerCommand) {}
}
