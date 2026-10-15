import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Uppercase redemption code entered by the user (e.g. "BOOKNEST10"). */
  @Column({ unique: true, length: 30 })
  code: string;

  /** Percentage discount applied to the cart subtotal (0–100). */
  @Column({ type: 'int' })
  discountPercent: number;

  /** Total number of times this coupon may be redeemed across all users. */
  @Column({ type: 'int', default: 1000 })
  maxUses: number;

  /** Counter incremented atomically each time the coupon is applied at checkout. */
  @Column({ type: 'int', default: 0 })
  usedCount: number;

  /** Coupon will not be applied after this date. Null means no expiry. */
  @Column({ type: 'varchar', length: 30, nullable: true })
  expiresAt: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
