import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { CalculateCheckoutDto } from '../../common/dto/calculate-checkout.dto';
import { ProcessOrderDto } from '../../common/dto/process-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';

@ApiTags('Checkout & Payment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate checkout pricing breakdown and gift points discount' })
  async calculateCheckout(@Body() dto: CalculateCheckoutDto, @CurrentUserId() userId: string) {
    return this.checkoutService.calculateCheckout(dto, userId);
  }

  @Post('process')
  @ApiOperation({ summary: 'Process payment and commit purchase' })
  async processOrder(@Body() dto: ProcessOrderDto, @CurrentUserId() userId: string) {
    return this.checkoutService.processOrder(dto, userId);
  }
}
