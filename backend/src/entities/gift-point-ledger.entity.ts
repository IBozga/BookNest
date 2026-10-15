import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum PointTransactionType {
  EARNED = 'EARNED',
  REDEEMED = 'REDEEMED',
  BONUS = 'BONUS',
  REVERSAL = 'REVERSAL'
}

@Entity('gift_point_ledgers')
export class GiftPointLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  userId: string;

  @ManyToOne(() => User, (user) => user.pointLedgers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  orderId: string;

  @Column({ type: 'int' })
  pointsChanged: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: PointTransactionType.REDEEMED
  })
  type: PointTransactionType;

  @Column({ type: 'int' })
  balanceAfter: number;

  @Column({ length: 255 })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}
