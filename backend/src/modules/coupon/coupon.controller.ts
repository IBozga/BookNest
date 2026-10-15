import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CouponService } from './coupon.service';
import { ValidateCouponDto } from '../../common/dto/validate-coupon.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';

@ApiTags('Coupons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post('validate')
  @HttpCode(200)
  // Tight limit: this endpoint would otherwise let a caller enumerate valid codes.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Validate a coupon code and preview the discount on the current cart' })
  validate(@Body() dto: ValidateCouponDto, @CurrentUserId() userId: string) {
    return this.couponService.validate(dto.code, userId);
  }
}
