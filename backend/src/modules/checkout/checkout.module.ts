import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  User,
  Address,
  CartItem,
  Order,
  OrderItem,
  PaymentTransaction,
  GiftPointLedger,
  Book,
} from '../../entities';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { UserModule } from '../user/user.module';
import { CartModule } from '../cart/cart.module';
import { AuthModule } from '../auth/auth.module';
import { CouponModule } from '../coupon/coupon.module';
import { MockPaymentGateway } from './mock-payment-gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Address,
      CartItem,
      Order,
      OrderItem,
      PaymentTransaction,
      GiftPointLedger,
      Book,
    ]),
    UserModule,
    CartModule,
    AuthModule,
    CouponModule,
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService, MockPaymentGateway],
  exports: [CheckoutService],
})
export class CheckoutModule {}
