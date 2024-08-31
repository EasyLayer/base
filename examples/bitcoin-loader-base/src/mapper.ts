import { ILoaderMapper } from '@easylayer/bitcoin-loader';
import { BlockModel } from './blocks';

export class BlocksMapper implements ILoaderMapper {
    public async load(block: any) {
        const { height, hash, previousblockhash, tx } = block;

        const model = new BlockModel();

        await model.insert({
            hash, 
            height: Number(height),
            previousblockhash: previousblockhash ? previousblockhash : '000000000000000000',
            tx: tx.map((t: any) => t.txid)
        });

        return model;
    }

    public async reorganisation(blocksHashes: string[]) {
        return {} as any;
    }
}