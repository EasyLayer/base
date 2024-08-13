export interface IIndexBlockCommand {
  batch: any;
  requestId: string;
}

export class IndexBlockCommand {
  constructor(public readonly payload: IIndexBlockCommand) {}
}
