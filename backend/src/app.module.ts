import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { getDatabaseConfig } from './database/database.config';
import { SeedService } from './database/seed.service';
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
} from './entities';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { CatalogueModule } from './modules/catalogue/catalogue.module';
import { CartModule } from './modules/cart/cart.module';
import { RecommendationModule } from './modules/recommendation/recommendation.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { OrderModule } from './modules/order/order.module';
import { StoreModule } from './modules/store/store.module';
import { CouponModule } from './modules/coupon/coupon.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    TypeOrmModule.forFeature([
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
    ]),
    AuthModule,
    UserModule,
    CatalogueModule,
    CartModule,
    RecommendationModule,
    CheckoutModule,
    OrderModule,
    StoreModule,
    CouponModule,
  ],
  providers: [SeedService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
