import { EntitySchema, generateModelFromSchema } from '@easylayer/bitcoin-loader';
import { ITransaction } from './txs';

export interface IBlock {
  hash: string;
  height: number;
  previousblockhash?: string;
  is_suspended: boolean;
  tx?: ITransaction[];
}

export const BlockSchema = new EntitySchema<IBlock>({
  name: 'blocks',
  tableName: 'blocks',
  columns: {
    hash: {
      type: 'varchar',
      primary: true,
    },
    height: {
      type: 'integer',
    },
    previousblockhash: {
      type: 'varchar',
      nullable: true,
    },
    is_suspended: {
      type: 'boolean',
      default: false,
    },
  },
  uniques: [
    {
      name: 'UQ__blocks__hash',
      columns: ['hash'],
    },
  ],
  relations: {
    tx: {
      type: 'one-to-many',   // Указываем тип связи
      target: 'txs',          // Ссылаемся на таблицу `txs`
      inverseSide: 'block',   // Ссылаемся на обратную сторону связи в `txs`
      cascade: true,          // Определяем каскадные операции
    },
  },
});

export const BlockModel = generateModelFromSchema(BlockSchema);