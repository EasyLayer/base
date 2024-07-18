import { Entity, PrimaryGeneratedColumn, Column, Unique, Index } from '@easylayer/read-database';

@Entity('outputs')
@Unique('UQ__txid__vout_index', ['txid', 'voutIndex'])
export class OutputViewModel {
  // TODO: The autoinerment type must be passed from variables, since SQLite does not support bigint.
  // OR remove autoinerment and put some uuid
  @PrimaryGeneratedColumn({ type: 'integer' })
  public id!: string | number;

  @Index()
  @Column({ type: 'varchar' })
  public address!: string;

  @Column({ type: 'varchar' })
  public txid!: string;

  @Column({ type: 'int' })
  public voutIndex!: number;

  @Column({ type: 'bigint', default: '0' })
  public amount!: string;

  @Column({ type: 'bigint' })
  public blockHeight!: string;

  @Column({ type: 'boolean', default: false })
  public isSpent: boolean = false;

  @Column({ type: 'boolean', default: false })
  public isSuspended: boolean = false;

  constructor(params?: any) {
    if (!params) return;

    this.address = params.address;
    this.amount = params.amount;
    this.txid = params.txid;
    this.blockHeight = params.blockHeight;
    this.voutIndex = params.voutIndex;

    if (params.isSpent !== undefined) {
      this.isSpent = params.isSpent;
    }

    if (params.isSuspended !== undefined) {
      this.isSuspended = params.isSuspended;
    }
  }
}
