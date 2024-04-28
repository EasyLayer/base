

// TODO: move to provider
export interface Block {
    height: number; // TODO: change to bigint
    hash: string;
    tx: any[];
}