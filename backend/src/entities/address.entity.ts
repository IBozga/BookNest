import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Order } from './order.entity';

@Entity('addresses')
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  userId: string;

  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 120 })
  fullName: string;

  @Column({ length: 255 })
  street: string;

  @Column({ length: 100 })
  city: string;

  @Column({ length: 100 })
  state: string;

  @Column({ length: 20 })
  zipCode: string;

  @Column({ length: 80, default: 'United States' })
  country: string;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @OneToMany(() => Order, (order) => order.address)
  orders: Order[];
}
