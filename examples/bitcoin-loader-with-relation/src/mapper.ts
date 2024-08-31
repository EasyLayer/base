import { ILoaderMapper } from '@easylayer/bitcoin-loader';
import { BlockModel, TransactionModel } from './models';

export class Mapper implements ILoaderMapper {
    public async load(block: any) {
        const { height, hash, previousblockhash, tx } = block;

        const blockModels: InstanceType<typeof BlockModel>[] = [];
        const txsModels: InstanceType<typeof TransactionModel>[] = [];

        if (!tx || tx.length === 0) {
          throw new Error(`Tx length = 0`);
        }

        tx.forEach((t: any) => {
            const { txid, vin, vout } = t;

            const txsModel = new TransactionModel();

            txsModel.insert({
                txid,
                vin,
                vout,
                block_hash: hash
            });

            txsModels.push(txsModel);
        });

        const blockModel = new BlockModel();

        await blockModel.insert({
            hash, 
            height: Number(height),
            previousblockhash: previousblockhash ? previousblockhash : '000000000000000000'
        });
        
        blockModels.push(blockModel);

        return [...blockModels, ...txsModels];
    }

    public async reorganisation(blocksHashes: string[]) {
        return {} as any;
    }
}