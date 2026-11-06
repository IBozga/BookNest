import { Body, Controller, Get, Patch, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { ModifyOrderDto } from '../../common/dto/modify-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';

@ApiTags('Orders & History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @ApiOperation({ summary: 'List user past orders' })
  async getOrders(@CurrentUserId() userId: string) {
    return this.orderService.getOrders(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single order details by ID' })
  async getOrderById(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.orderService.getOrderById(id, userId);
  }

  @Post(':id/buy-again')
  @ApiOperation({ summary: 'Buy It Again: Re-add all order items to cart' })
  async buyAgain(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.orderService.buyAgain(id, userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a completed order within 48 hours: restock, refund and reverse points' })
  async cancelOrder(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.orderService.cancelOrder(id, userId);
  }

  @Post(':id/return')
  @ApiOperation({ summary: 'Return a completed order within 30 days of purchase: restock, refund and reverse points' })
  async returnOrder(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.orderService.returnOrder(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Reduce or remove item quantities within the 48-hour modify window' })
  async modifyOrder(
    @Param('id') id: string,
    @Body() dto: ModifyOrderDto,
    @CurrentUserId() userId: string,
  ) {
    return this.orderService.modifyOrder(id, dto, userId);
  }
}
