import { Entity, Column, PrimaryColumn } from '@easylayer/core/views-rdbms-db';

@Entity('system')
export class System {
  @PrimaryColumn()
  public id!: number;

  @Column({ type: 'integer' })
  public last_block_height!: number;

  constructor(params?: any) {
    this.id = 1;
    this.last_block_height = params?.last_block_height || -1;
  }
}
