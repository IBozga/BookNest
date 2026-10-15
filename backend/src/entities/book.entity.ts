import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Category } from './category.entity';
import { Brand } from './brand.entity';
import { OrderItem } from './order-item.entity';
import { CartItem } from './cart-item.entity';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 180 })
  author: string;

  @Column({ unique: true, length: 30 })
  isbn: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int', default: 0 })
  stockQuantity: number;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  @Column({ type: 'text', nullable: true })
  coverImage: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 4.5 })
  rating: number;

  @Column({ type: 'int', default: 12 })
  numReviews: number;

  @Column({ length: 50, default: 'eBook' })
  format: string; // eBook, Hardcover, Paperback

  // Lead time in days; clients derive the tentative delivery date from it
  @Column({ type: 'int', default: 3 })
  deliveryDays: number;

  /** Premium-only title: hidden from catalogue queries for non-premium users. */
  @Column({ type: 'boolean', default: false })
  isPremium: boolean;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ nullable: true })
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.books, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ nullable: true })
  brandId: string;

  @ManyToOne(() => Brand, (brand) => brand.books, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'brandId' })
  brand: Brand;

  @OneToMany(() => OrderItem, (item) => item.book)
  orderItems: OrderItem[];

  @OneToMany(() => CartItem, (item) => item.book)
  cartItems: CartItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
