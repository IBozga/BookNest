import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Category, Brand, Book } from '../../entities';
import { QueryBooksDto, BookSortOrder } from '../../common/dto/query-books.dto';
import { UserService } from '../user/user.service';
import { canViewPremium } from '../auth/entitlement.util';

@Injectable()
export class CatalogueService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(Book)
    private readonly bookRepo: Repository<Book>,
    private readonly userService: UserService,
  ) {}

  async getCategories(): Promise<Category[]> {
    return this.categoryRepo.find({ order: { name: 'ASC' } });
  }

  async getBrands(): Promise<Brand[]> {
    return this.brandRepo.find({ order: { name: 'ASC' } });
  }

  /** Whether the caller (anonymous when no id) is entitled to see premium-only titles. */
  private async canSeePremium(userId?: string): Promise<boolean> {
    if (!userId) return false;
    try {
      const user = await this.userService.getUserById(userId);
      return canViewPremium(user.role);
    } catch {
      return false;
    }
  }

  /** Hides premium-only titles from callers who are not entitled to them. */
  private restrictToEntitlement(qb: SelectQueryBuilder<Book>, seesPremium: boolean) {
    if (!seesPremium) {
      qb.andWhere('book.isPremium = :isPremium', { isPremium: false });
    }
    return qb;
  }

  async getBooks(query: QueryBooksDto, userId?: string): Promise<Book[]> {
    const seesPremium = await this.canSeePremium(userId);

    const qb = this.bookRepo
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.brand', 'brand');

    this.restrictToEntitlement(qb, seesPremium);

    if (query.categoryId) {
      qb.andWhere('book.categoryId = :categoryId', { categoryId: query.categoryId });
    }

    if (query.categorySlug) {
      qb.andWhere('category.slug = :categorySlug', { categorySlug: query.categorySlug });
    }

    if (query.brandId) {
      qb.andWhere('book.brandId = :brandId', { brandId: query.brandId });
    }

    if (query.brandSlug) {
      qb.andWhere('brand.slug = :brandSlug', { brandSlug: query.brandSlug });
    }

    if (query.isAvailable !== undefined) {
      qb.andWhere('book.isAvailable = :isAvailable', { isAvailable: query.isAvailable });
    }

    if (query.search) {
      const searchTerm = `%${query.search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(book.title) LIKE :search OR LOWER(book.author) LIKE :search OR LOWER(book.description) LIKE :search)',
        { search: searchTerm },
      );
    }

    switch (query.sortBy) {
      case BookSortOrder.PRICE_ASC:
        qb.orderBy('book.price', 'ASC');
        break;
      case BookSortOrder.PRICE_DESC:
        qb.orderBy('book.price', 'DESC');
        break;
      case BookSortOrder.RATING_DESC:
        qb.orderBy('book.rating', 'DESC');
        break;
      case BookSortOrder.NEWEST:
        qb.orderBy('book.createdAt', 'DESC');
        break;
      default:
        qb.orderBy('book.rating', 'DESC').addOrderBy('book.title', 'ASC');
        break;
    }

    return qb.getMany();
  }

  async getBookById(id: string, userId?: string): Promise<Book> {
    const book = await this.bookRepo.findOne({
      where: { id },
      relations: ['category', 'brand'],
    });

    // A premium title is reported as missing to callers who may not see it.
    if (!book || (book.isPremium && !(await this.canSeePremium(userId)))) {
      throw new NotFoundException(`Book with ID "${id}" not found`);
    }

    return book;
  }

  async getRelatedBooks(bookId: string, limit = 4, userId?: string): Promise<Book[]> {
    const book = await this.getBookById(bookId, userId);
    const seesPremium = await this.canSeePremium(userId);

    const qb = this.bookRepo
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.brand', 'brand')
      .where('book.id != :bookId', { bookId });

    this.restrictToEntitlement(qb, seesPremium);

    if (book.categoryId && book.brandId) {
      qb.andWhere('(book.categoryId = :categoryId OR book.brandId = :brandId)', {
        categoryId: book.categoryId,
        brandId: book.brandId,
      });
    } else if (book.categoryId) {
      qb.andWhere('book.categoryId = :categoryId', { categoryId: book.categoryId });
    } else if (book.brandId) {
      qb.andWhere('book.brandId = :brandId', { brandId: book.brandId });
    }

    qb.orderBy('book.rating', 'DESC').take(limit);

    const related = await qb.getMany();

    // Fallback if not enough matching category/brand
    if (related.length < limit) {
      const fallbackQb = this.bookRepo
        .createQueryBuilder('book')
        .leftJoinAndSelect('book.category', 'category')
        .leftJoinAndSelect('book.brand', 'brand')
        .where('book.id != :bookId', { bookId })
        .andWhere(
          related.length > 0 ? 'book.id NOT IN (:...existingIds)' : '1=1',
          { existingIds: related.map((r) => r.id) },
        );
      this.restrictToEntitlement(fallbackQb, seesPremium);

      const additional = await fallbackQb
        .orderBy('book.rating', 'DESC')
        .take(limit - related.length)
        .getMany();

      return [...related, ...additional];
    }

    return related;
  }

  /**
   * Up-sell: pricier, available alternatives in the same category, nearest price step first.
   * Cross-sell (getRelatedBooks) suggests similar titles; up-sell suggests a better/more premium one.
   */
  async getUpsellBooks(bookId: string, limit = 3, userId?: string): Promise<Book[]> {
    const book = await this.getBookById(bookId, userId);
    const seesPremium = await this.canSeePremium(userId);

    const qb = this.bookRepo
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.brand', 'brand')
      .where('book.id != :bookId', { bookId })
      .andWhere('book.isAvailable = :isAvailable', { isAvailable: true })
      .andWhere('book.price > :price', { price: Number(book.price) });

    this.restrictToEntitlement(qb, seesPremium);

    if (book.categoryId) {
      qb.andWhere('book.categoryId = :categoryId', { categoryId: book.categoryId });
    }

    return qb.orderBy('book.price', 'ASC').addOrderBy('book.rating', 'DESC').take(limit).getMany();
  }
}
