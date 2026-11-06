import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from '../../common/dto/add-to-cart.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user shopping cart' })
  async getCart(@CurrentUserId() userId: string) {
    return this.cartService.getCart(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a book to shopping cart' })
  async addToCart(@Body() dto: AddToCartDto, @CurrentUserId() userId: string) {
    return this.cartService.addToCart(dto, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update cart item quantity' })
  async updateQuantity(
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUserId() userId: string,
  ) {
    return this.cartService.updateQuantity(id, dto.quantity, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove item from shopping cart' })
  async removeFromCart(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.cartService.removeFromCart(id, userId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all items from shopping cart' })
  async clearCart(@CurrentUserId() userId: string) {
    return this.cartService.clearCart(userId);
  }
}
