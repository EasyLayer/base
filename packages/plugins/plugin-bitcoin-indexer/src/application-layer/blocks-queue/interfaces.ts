

// TODO: move to provider
export interface Block {
    height: bigint; // TODO: change to bigint
    hash: string;
    tx: any[];
}