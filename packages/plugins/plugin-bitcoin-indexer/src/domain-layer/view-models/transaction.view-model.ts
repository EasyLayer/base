import { Entity, PrimaryGeneratedColumn, Column, Unique, ManyToOne, JoinColumn, Index } from '@easylayer/read-database';
import { BlockViewModel } from './block.view-model';

@Entity('transactions')
@Unique('UQ__txid__index', ['txid'])
export class TransactionViewModel {
  // TODO: The autoinerment type must be passed from variables, since SQLite does not support bigint.
  // OR remove autoinerment and put some uuid
  // IMPORTANT: We use this field to sort transactions (if anything, we didn’t succeed with the datetime)
  @PrimaryGeneratedColumn({ type: 'integer' })
  public id!: string | number;

  // NOTE: txid uniq and index
  @Index()
  @Column({ type: 'varchar' })
  public txid!: string;

  @Column({ type: 'varchar' })
  public status!: string;

  @Column({ type: 'json' })
  public vin!: any;

  @Column({ type: 'json' })
  public vout!: any;

  @ManyToOne(() => BlockViewModel, (block) => block.tx)
  @JoinColumn({ name: 'blockHash', referencedColumnName: 'hash' })
  public block!: BlockViewModel;

  constructor(params?: any) {
    if (!params) return;

    this.txid = params.txid;
    this.status = params.status;
    this.vin = params.vin;
    this.vout = params.vout;
    this.block = params.block;
  }
}
