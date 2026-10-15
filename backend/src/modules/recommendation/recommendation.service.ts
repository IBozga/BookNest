import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderItem, Book } from '../../entities';
import { UserService } from '../user/user.service';

@Injectable()
export class RecommendationService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Book)
    private readonly bookRepo: Repository<Book>,
    private readonly userService: UserService,
  ) {}

  async getRecommendationsBasedOnOrderHistory(userId?: string, limit = 4): Promise<Book[]> {
    const user = userId ? await this.userService.getUserById(userId) : await this.userService.getDefaultUser();

    // 1. Fetch user's completed orders with their items and books
    const orders = await this.orderRepo.find({
      where: { userId: user.id },
      relations: ['items', 'items.book', 'items.book.category', 'items.book.brand'],
    });

    const orderedBookIds: string[] = [];
    const categoryFrequency = new Map<string, number>();
    const brandFrequency = new Map<string, number>();

    for (const order of orders) {
      if (order.items) {
        for (const item of order.items) {
          if (item.book) {
            orderedBookIds.push(item.book.id);
            if (item.book.categoryId) {
              categoryFrequency.set(
                item.book.categoryId,
                (categoryFrequency.get(item.book.categoryId) || 0) + 1,
              );
            }
            if (item.book.brandId) {
              brandFrequency.set(
                item.book.brandId,
                (brandFrequency.get(item.book.brandId) || 0) + 1,
              );
            }
          }
        }
      }
    }

    // 2. Identify top categories and brands
    const topCategoryIds = Array.from(categoryFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    const topBrandIds = Array.from(brandFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);

    const qb = this.bookRepo
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.brand', 'brand')
      .where('book.isAvailable = :isAvailable', { isAvailable: true });

    if (orderedBookIds.length > 0) {
      qb.andWhere('book.id NOT IN (:...orderedIds)', { orderedIds: orderedBookIds });
    }

    if (topCategoryIds.length > 0 || topBrandIds.length > 0) {
      const conditions: string[] = [];
      const params: Record<string, any> = {};

      if (topCategoryIds.length > 0) {
        conditions.push('book.categoryId IN (:...topCats)');
        params.topCats = topCategoryIds;
      }
      if (topBrandIds.length > 0) {
        conditions.push('book.brandId IN (:...topBrands)');
        params.topBrands = topBrandIds;
      }

      qb.andWhere(`(${conditions.join(' OR ')})`, params);
    }

    qb.orderBy('book.rating', 'DESC').take(limit);

    let recommendations = await qb.getMany();

    // 3. Fallback to top-rated available books if recommendation pool is small
    if (recommendations.length < limit) {
      const existingIds = [...orderedBookIds, ...recommendations.map((b) => b.id)];
      const fallbackQb = this.bookRepo
        .createQueryBuilder('book')
        .leftJoinAndSelect('book.category', 'category')
        .leftJoinAndSelect('book.brand', 'brand')
        .where('book.isAvailable = :isAvailable', { isAvailable: true });

      if (existingIds.length > 0) {
        fallbackQb.andWhere('book.id NOT IN (:...existingIds)', { existingIds });
      }

      const fallbacks = await fallbackQb
        .orderBy('book.rating', 'DESC')
        .take(limit - recommendations.length)
        .getMany();

      recommendations = [...recommendations, ...fallbacks];
    }

    return recommendations;
  }
}
