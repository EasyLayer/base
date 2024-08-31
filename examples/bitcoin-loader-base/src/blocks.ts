import { EntitySchema, generateModelFromSchema } from '@easylayer/bitcoin-loader';

export const BlockSchema = new EntitySchema({
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
    tx: {
      type: 'json',
      nullable: false,
    },
  },
  uniques: [
    {
      name: 'UQ__blocks__hash',
      columns: ['hash'],
    },
  ],
});

export const BlockModel = generateModelFromSchema(BlockSchema);