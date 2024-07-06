export interface IIndexBlockCommand {
  block: any;
  requestId: string;
}

export class IndexBlockCommand {
  constructor(public readonly payload: IIndexBlockCommand) {}
}
