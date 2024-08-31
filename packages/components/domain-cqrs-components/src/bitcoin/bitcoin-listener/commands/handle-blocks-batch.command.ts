export interface IHandleBlocksBatchCommand {
  batch: any;
  requestId: string;
}

export class HandleBlocksBatchCommand {
  constructor(public readonly payload: IHandleBlocksBatchCommand) {}
}
