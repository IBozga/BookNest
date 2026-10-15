import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem, Book } from '../../entities';
import { AddToCartDto } from '../../common/dto/add-to-cart.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartRepo: Repository<CartItem>,
    @InjectRepository(Book)
    private readonly bookRepo: Repository<Book>,
    private readonly userService: UserService,
  ) {}

  async getCart(userId?: string) {
    const user = userId ? await this.userService.getUserById(userId) : await this.userService.getDefaultUser();

    const items = await this.cartRepo.find({
      where: { userId: user.id },
      relations: ['book', 'book.category', 'book.brand'],
      order: { createdAt: 'DESC' },
    });

    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
    const subtotal = items.reduce((acc, item) => {
      const price = item.book ? Number(item.book.price) : 0;
      return acc + price * item.quantity;
    }, 0);

    return {
      userId: user.id,
      items,
      totalItems,
      subtotal: Number(subtotal.toFixed(2)),
    };
  }

  async addToCart(dto: AddToCartDto, userId?: string) {
    const user = userId ? await this.userService.getUserById(userId) : await this.userService.getDefaultUser();

    const book = await this.bookRepo.findOne({ where: { id: dto.bookId } });
    if (!book) {
      throw new NotFoundException(`Book with ID ${dto.bookId} not found`);
    }

    if (!book.isAvailable || book.stockQuantity <= 0) {
      throw new BadRequestException(`"${book.title}" is currently out of stock`);
    }

    const qtyToAdd = dto.quantity || 1;

    let cartItem = await this.cartRepo.findOne({
      where: { userId: user.id, bookId: dto.bookId },
      relations: ['book'],
    });

    if (cartItem) {
      const newQty = cartItem.quantity + qtyToAdd;
      if (newQty > book.stockQuantity) {
        throw new BadRequestException(`Only ${book.stockQuantity} copies available in stock`);
      }
      cartItem.quantity = newQty;
      await this.cartRepo.save(cartItem);
    } else {
      if (qtyToAdd > book.stockQuantity) {
        throw new BadRequestException(`Only ${book.stockQuantity} copies available in stock`);
      }
      cartItem = this.cartRepo.create({
        userId: user.id,
        bookId: dto.bookId,
        quantity: qtyToAdd,
      });
      await this.cartRepo.save(cartItem);
    }

    return this.getCart(user.id);
  }

  async updateQuantity(cartItemId: string, quantity: number, userId?: string) {
    const user = userId ? await this.userService.getUserById(userId) : await this.userService.getDefaultUser();

    const cartItem = await this.cartRepo.findOne({
      where: { id: cartItemId, userId: user.id },
      relations: ['book'],
    });

    if (!cartItem) {
      throw new NotFoundException(`Cart item ${cartItemId} not found`);
    }

    if (quantity <= 0) {
      await this.cartRepo.remove(cartItem);
    } else {
      if (cartItem.book && quantity > cartItem.book.stockQuantity) {
        throw new BadRequestException(`Only ${cartItem.book.stockQuantity} copies available in stock`);
      }
      cartItem.quantity = quantity;
      await this.cartRepo.save(cartItem);
    }

    return this.getCart(user.id);
  }

  async removeFromCart(cartItemId: string, userId?: string) {
    const user = userId ? await this.userService.getUserById(userId) : await this.userService.getDefaultUser();

    const cartItem = await this.cartRepo.findOne({
      where: { id: cartItemId, userId: user.id },
    });

    if (!cartItem) {
      throw new NotFoundException(`Cart item ${cartItemId} not found`);
    }

    await this.cartRepo.remove(cartItem);
    return this.getCart(user.id);
  }

  async clearCart(userId?: string) {
    const user = userId ? await this.userService.getUserById(userId) : await this.userService.getDefaultUser();
    await this.cartRepo.delete({ userId: user.id });
    return { success: true, message: 'Cart cleared successfully' };
  }
}
