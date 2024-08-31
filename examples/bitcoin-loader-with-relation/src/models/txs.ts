import { EntitySchema, generateModelFromSchema } from '@easylayer/bitcoin-loader';
import { IBlock } from './blocks';

export interface ITransaction {
  txid: string;
  vin: any;
  vout: any;
  block_hash: string;
  block?: IBlock;
}

export const TransactionSchema = new EntitySchema<ITransaction>({
  name: 'txs',
  tableName: 'txs',
  columns: {
    txid: {
      type: 'varchar',
      primary: true,
    },
    vin: {
      type: 'json',
      nullable: false,
    },
    vout: {
      type: 'json',
      nullable: false,
    },
    block_hash: {
      type: 'varchar',
      nullable: false,
    },
  },
  uniques: [
    {
      name: 'UQ__txs__txid',
      columns: ['txid'],
    },
  ],
  relations: {
    block: {
      type: 'many-to-one',     // Определяем тип связи как `many-to-one`
      target: 'blocks',        // Ссылаемся на таблицу `blocks`
      inverseSide: 'tx',       // Указываем обратную сторону связи в `blocks`
      joinColumn: {
        name: 'block_hash',    // Это внешний ключ в таблице `txs`, который ссылается на поле `hash` в таблице `blocks`
        referencedColumnName: 'hash',
      },
    },
  },
});

export const TransactionModel = generateModelFromSchema(TransactionSchema);
