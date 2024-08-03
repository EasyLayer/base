import { Entity, ManyToOne, Column, Unique, JoinColumn, PrimaryColumn } from '@easylayer/core/read-database';
import { OutputViewModel } from './otputs.view-model';

@Entity('inputs')
@Unique('UQ__output_txid__output_n', ['output_txid', 'output_n'])
export class InputViewModel {
  @Column({ type: 'varchar', nullable: true })
  public txid!: string; // tx.vin.txid

  @PrimaryColumn({ type: 'varchar' })
  public output_txid!: string; // tx.txid

  @PrimaryColumn({ type: 'int' })
  public output_n!: number;

  @ManyToOne(() => OutputViewModel)
  @JoinColumn([
    { name: 'output_txid', referencedColumnName: 'txid' },
    { name: 'output_n', referencedColumnName: 'n' },
  ])
  public output!: OutputViewModel;
}
