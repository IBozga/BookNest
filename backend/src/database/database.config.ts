import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import {
  User,
  Category,
  Brand,
  Book,
  Address,
  CartItem,
  Order,
  OrderItem,
  PaymentTransaction,
  GiftPointLedger,
  Coupon,
} from '../entities';

const ENTITIES = [
  User,
  Category,
  Brand,
  Book,
  Address,
  CartItem,
  Order,
  OrderItem,
  PaymentTransaction,
  GiftPointLedger,
  Coupon,
];

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const dbType = process.env.DATABASE_TYPE || 'sqlite';

  if (dbType === 'postgres') {
    return {
      type: 'postgres',
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'ebookstore',
      entities: ENTITIES,
      synchronize: true, // auto-sync schema for development
      logging: false,
    };
  }

  // SQLite default for instant zero-dependency local readiness
  return {
    type: 'sqlite',
    database: process.env.SQLITE_DB_PATH || ':memory:',
    entities: ENTITIES,
    synchronize: true,
    logging: false,
  };
};
