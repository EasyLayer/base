import { EntitySchema, generateModelFromSchema } from '@easylayer/bitcoin-loader';

export interface IOutput {
    address?: string;
    txid: string;           // block.tx[].txid
    n: number;              // block.tx[].vout[].n
    value: string;
    block_height: number;
    is_suspended: boolean;
}

export const OutputSchema = new EntitySchema<IOutput>({
    name: 'outputs',
    tableName: 'outputs',
    columns: {
      address: {
        type: 'varchar',
        nullable: true,
      },
      txid: {
        type: 'varchar',
        primary: true,
        nullable: false,
      },
      n: {
        type: 'int',
        primary: true,
        nullable: false,
      },
      value: {
        type: 'bigint',
        default: '0',
      },
      block_height: {
        type: 'integer',
        nullable: false,
      },
      is_suspended: {
        type: 'boolean',
        default: false,
      },
    },
    uniques: [
      {
        name: 'UQ__outputs__txid__n',
        columns: ['txid', 'n'],
      },
    ],
});

export const OutputModel = generateModelFromSchema(OutputSchema);
  