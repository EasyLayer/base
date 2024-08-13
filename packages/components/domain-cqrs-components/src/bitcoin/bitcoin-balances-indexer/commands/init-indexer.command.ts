export interface IInitIndexerCommand {
  requestId: string;
  lastReadStateHeight?: number;
}

export class InitIndexerCommand {
  constructor(public readonly payload: IInitIndexerCommand) {}
}
