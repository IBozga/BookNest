import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ length: 50 })
  paymentMethod: string;

  @Column({ length: 100, unique: true })
  transactionRef: string;

  @Column({ length: 30, default: 'SUCCESS' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
