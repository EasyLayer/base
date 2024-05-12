

// TODO: move to provider
export interface Block {
    height: bigint;
    hash: string;
    tx: any[];
}