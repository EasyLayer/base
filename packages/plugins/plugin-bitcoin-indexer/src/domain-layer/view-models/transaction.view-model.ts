import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from '@easylayer/core/read-database';
import { BlockViewModel } from './block.view-model';

@Entity('transactions')
export class TransactionViewModel {
  // TODO: The autoinerment type must be passed from variables, since SQLite does not support bigint.
  // OR remove autoinerment and put some uuid
  // IMPORTANT: We use this field to sort transactions (if anything, we didn’t succeed with the datetime)

  @PrimaryColumn({ type: 'varchar' })
  public txid!: string;

  @Column({ type: 'json' })
  public vin!: any;

  @Column({ type: 'json' })
  public vout!: any;

  @Column({ type: 'varchar' })
  public block_hash!: string; // block.hash

  @ManyToOne(() => BlockViewModel, (block) => block.tx)
  @JoinColumn({ name: 'block_hash', referencedColumnName: 'hash' })
  public block!: BlockViewModel;
}
