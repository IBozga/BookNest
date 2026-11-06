import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Address } from './address.entity';
import { OrderItem } from './order-item.entity';
import { PaymentTransaction } from './payment-transaction.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED'
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 64 })
  orderNumber: string;

  @Column({ nullable: false })
  userId: string;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** Contact email supplied at checkout (used for guest orders). */
  @Column({ type: 'varchar', length: 180, nullable: true })
  contactEmail: string | null;

  @Column({ nullable: true })
  addressId: string;

  @ManyToOne(() => Address, (address) => address.orders, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'addressId' })
  address: Address;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'int', default: 0 })
  pointsRedeemed: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  finalAmount: number;

  /** Portion of finalAmount paid from the user's wallet balance. */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  walletAmount: number;

  /** Coupon code applied at checkout, if any. */
  @Column({ type: 'varchar', length: 30, nullable: true })
  couponCode: string | null;

  @Column({ length: 50, default: 'CREDIT_CARD' })
  paymentMethod: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: OrderStatus.COMPLETED
  })
  status: OrderStatus;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => PaymentTransaction, (tx) => tx.order)
  transactions: PaymentTransaction[];

  /** Stub return-shipment label generated when the order is returned. Not persisted to a file store. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  returnLabel: string | null;

  /** Computed by OrderService (not persisted): whether the order can still be cancelled. */
  canCancel?: boolean;

  /** Computed by OrderService (not persisted): whether the order can be returned. */
  canReturn?: boolean;

  /** Computed by OrderService (not persisted): whether items can still be removed or reduced. */
  canModify?: boolean;
}
