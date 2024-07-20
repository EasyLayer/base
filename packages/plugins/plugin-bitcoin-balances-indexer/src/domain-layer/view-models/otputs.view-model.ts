import { Entity, Column, Unique, Index, PrimaryColumn } from '@easylayer/read-database';

@Entity('outputs')
@Unique('UQ__txid__n', ['txid', 'n'])
@Index('IDX_address', ['address'], { where: 'address IS NOT NULL' })
export class OutputViewModel {
  @Column({ type: 'varchar', nullable: true })
  public address!: string; // null for coinbase outputs

  @PrimaryColumn({ type: 'varchar' })
  public txid!: string; // tx.txid

  @PrimaryColumn({ type: 'int' })
  public n!: number;

  @Column({
    type: 'bigint',
    default: '0',
    transformer: { to: (value) => value.toString(), from: (value) => BigInt(value) },
  })
  public value!: string;

  @Column({ type: 'integer' })
  public block_height!: number;

  @Column({ type: 'boolean', default: false })
  public is_suspended!: boolean;

  @Column({ type: 'varchar', nullable: true })
  public coinbase!: string;
}
