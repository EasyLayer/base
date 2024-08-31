import { ILoaderMapper } from '@easylayer/bitcoin-loader';
import { ScriptUtilService } from '@easylayer/core/bitcoin-network-provider';
import { Currency, Money } from '@easylayer/components/arithmetic';
import { OutputModel, InputModel } from './models';

export class Mapper implements ILoaderMapper {
    public async load(block: any) {
        const currency: Currency = {
          code: 'BTC',
          minorUnit: 8,
        };

        const { height, tx } = block;

        const outputModels: InstanceType<typeof OutputModel>[] = [];
        const inputModels: InstanceType<typeof InputModel>[] = [];

        if (!tx || tx.length === 0) {
          throw new Error(`Tx length = 0`);
        }

        for (const t of tx) {
          const txid = t.txid;

          for (const vout of t.vout) {
            const address = ScriptUtilService.getScriptHashFromScriptPubKey(vout.scriptPubKey);
            const value = Money.fromDecimal(vout.value, currency).toCents();

            const outputModel = new OutputModel();

            await outputModel.insert({
              txid,
              address,
              value,
              n: Number(vout.n),
              block_height: Number(height)
            });

            outputModels.push(outputModel);
          }

          for (const vin of t.vin) {
            if (vin.txid && vin.vout) {
              const inputModel = new InputModel();

              await inputModel.insert({
                txid,
                output_txid: vin.txid,
                output_n: Number(vin.vout),
              });

              inputModels.push(inputModel);
            }
          }
        }

        return [...outputModels, ...inputModels];
    }

    public async reorganisation(blocksHashes: string[]) {
        return {} as any;
    }
}