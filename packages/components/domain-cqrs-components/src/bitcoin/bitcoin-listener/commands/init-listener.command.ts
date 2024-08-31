export interface IInitListenerCommand {
  requestId: string;
  startHeight: string | number;
  lastReadStateHeight?: number;
}

export class InitListenerCommand {
  constructor(public readonly payload: IInitListenerCommand) {}
}
