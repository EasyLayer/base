export interface IInitIndexerCommand {
  requestId: string;
  startHeight: string | number;
  lastReadStateHeight?: number;
}

export class InitIndexerCommand {
  constructor(public readonly payload: IInitIndexerCommand) {}
}
