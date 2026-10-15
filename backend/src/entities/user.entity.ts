import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Address } from './address.entity';
import { Order } from './order.entity';
import { CartItem } from './cart-item.entity';
import { GiftPointLedger } from './gift-point-ledger.entity';

export enum UserRole {
  CUSTOMER = 'customer',
  PREMIUM = 'premium',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ unique: true, length: 180 })
  email: string;

  /** scrypt hash in the form `salt:hash` (hex). Never returned by queries unless explicitly selected. */
  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  passwordHash: string | null;

  /** True for anonymous guest-checkout accounts; they cannot sign in with a password. */
  @Column({ type: 'boolean', default: false })
  isGuest: boolean;

  /** Role-based access control: customer | premium | admin. */
  @Column({ type: 'varchar', length: 20, default: UserRole.CUSTOMER })
  role: UserRole;

  @Column({ type: 'int', default: 500 })
  rewardPoints: number;

  /** Wallet credit balance (in store currency). Can be used as a payment method at checkout. */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  walletBalance: number;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Address, (address) => address.user)
  addresses: Address[];

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => CartItem, (item) => item.user)
  cartItems: CartItem[];

  @OneToMany(() => GiftPointLedger, (ledger) => ledger.user)
  pointLedgers: GiftPointLedger[];
}
