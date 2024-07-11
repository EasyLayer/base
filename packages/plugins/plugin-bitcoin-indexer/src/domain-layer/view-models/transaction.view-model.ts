import { Entity, PrimaryColumn, Column, ManyToOne } from '@easylayer/read-database';
import { BlockViewModel } from './block.view-model';

@Entity('transactions')
export class TransactionViewModel {
  // NOTE: txid uniq and index
  @PrimaryColumn({ type: 'varchar' })
  public txid!: string;

  @Column({ type: 'varchar' })
  public status!: string;

  @Column({ type: 'json' })
  public vin!: any;

  @Column({ type: 'json' })
  public vout!: any;

  @ManyToOne(() => BlockViewModel, (block) => block.transactions)
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
