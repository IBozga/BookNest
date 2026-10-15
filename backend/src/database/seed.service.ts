import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Category,
  Brand,
  Book,
  Coupon,
  User,
  UserRole,
  Address,
  Order,
  OrderItem,
  OrderStatus,
  GiftPointLedger,
  PointTransactionType,
} from '../entities';
import { seedCategories, seedBrands, seedBooks } from './seed.data';
import { hashPassword } from '../modules/auth/password.util';

const DEMO_USER_EMAIL = 'alex.johnson@example.com';

/** Mock coupons; created if missing so existing databases get them too. */
const SEED_COUPONS = [
  { code: 'BOOKNEST10', discountPercent: 10, maxUses: 1000 },
  { code: 'READ2025', discountPercent: 10, maxUses: 1000 },
];

/** Titles reserved for premium members (entitlement mock). */
const PREMIUM_ISBNS = ['978-1492098822', '978-1524743017'];

// Lead time in days by format: digital is near-instant, print needs shipping
const DELIVERY_DAYS_BY_FORMAT: Record<string, number> = {
  eBook: 1,
  Paperback: 3,
  Hardcover: 5,
};

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(Book)
    private readonly bookRepo: Repository<Book>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(GiftPointLedger)
    private readonly pointRepo: Repository<GiftPointLedger>,
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
  ) {}

  async onModuleInit() {
    await this.seedAll();
    await this.ensureMockData();
    await this.ensureDemoUserPassword();
  }

  /** Idempotent: brings new mock data (coupons, premium titles, premium demo user) to existing databases. */
  async ensureMockData() {
    for (const coupon of SEED_COUPONS) {
      const exists = await this.couponRepo.findOne({ where: { code: coupon.code } });
      if (!exists) {
        await this.couponRepo.save(this.couponRepo.create(coupon));
      }
    }
    for (const isbn of PREMIUM_ISBNS) {
      await this.bookRepo.update({ isbn }, { isPremium: true });
    }
    await this.userRepo.update({ email: DEMO_USER_EMAIL, role: UserRole.CUSTOMER }, { role: UserRole.PREMIUM });
  }

  /** Sets the demo user's password from SEED_USER_PASSWORD (only if the user has none yet). */
  private async ensureDemoUserPassword() {
    const password = process.env.SEED_USER_PASSWORD;
    if (!password) {
      this.logger.warn('SEED_USER_PASSWORD is not set; the demo user cannot sign in.');
      return;
    }
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: DEMO_USER_EMAIL })
      .getOne();
    if (user && !user.passwordHash) {
      await this.userRepo.update({ id: user.id }, { passwordHash: await hashPassword(password) });
      this.logger.log('Demo user password initialised from SEED_USER_PASSWORD.');
    }
  }

  async seedAll() {
    const existingBooks = await this.bookRepo.count();
    if (existingBooks > 0) {
      this.logger.log('Database already seeded. Skipping initial seeding.');
      return;
    }

    this.logger.log('Starting database seeding...');

    // 1. Seed Categories
    const categoryMap = new Map<string, Category>();
    for (const cat of seedCategories) {
      let category = await this.categoryRepo.findOne({ where: { slug: cat.slug } });
      if (!category) {
        category = await this.categoryRepo.save(this.categoryRepo.create(cat));
      }
      categoryMap.set(cat.slug, category);
    }

    // 2. Seed Brands / Publishers
    const brandMap = new Map<string, Brand>();
    for (const br of seedBrands) {
      let brand = await this.brandRepo.findOne({ where: { slug: br.slug } });
      if (!brand) {
        brand = await this.brandRepo.save(this.brandRepo.create(br));
      }
      brandMap.set(br.slug, brand);
    }

    // 3. Seed Books
    const createdBooks: Book[] = [];
    for (const b of seedBooks) {
      const category = categoryMap.get(b.categorySlug);
      const brand = brandMap.get(b.brandSlug);
      const book = this.bookRepo.create({
        title: b.title,
        author: b.author,
        isbn: b.isbn,
        price: b.price,
        stockQuantity: b.stockQuantity,
        isAvailable: b.isAvailable,
        coverImage: b.coverImage,
        description: b.description,
        rating: b.rating,
        numReviews: b.numReviews,
        format: b.format,
        deliveryDays: DELIVERY_DAYS_BY_FORMAT[b.format] ?? 3,
        tags: b.tags,
        categoryId: category ? category.id : null,
        brandId: brand ? brand.id : null,
      });
      const saved = await this.bookRepo.save(book);
      createdBooks.push(saved);
    }

    // 4. Seed Default User
    let user = await this.userRepo.findOne({ where: { email: DEMO_USER_EMAIL } });
    if (!user) {
      user = await this.userRepo.save(
        this.userRepo.create({
          name: 'Alex Johnson',
          email: 'alex.johnson@example.com',
          rewardPoints: 500, // 500 gift points available for redemption
        }),
      );

      // Seed Points Ledger
      await this.pointRepo.save(
        this.pointRepo.create({
          userId: user.id,
          pointsChanged: 500,
          type: PointTransactionType.BONUS,
          balanceAfter: 500,
          description: 'Welcome Bonus Reward Points',
        }),
      );

      // Seed Delivery Addresses
      const address1 = await this.addressRepo.save(
        this.addressRepo.create({
          userId: user.id,
          fullName: 'Alex Johnson',
          street: '123 Innovation Blvd, Suite 400',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701',
          country: 'United States',
          isDefault: true,
        }),
      );

      await this.addressRepo.save(
        this.addressRepo.create({
          userId: user.id,
          fullName: 'Alex Johnson (Office)',
          street: '550 Tech Way',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94107',
          country: 'United States',
          isDefault: false,
        }),
      );

      // 5. Seed Past Order for "Buy It Again" and Recommendations
      if (createdBooks.length >= 2) {
        const pastBook1 = createdBooks[0]; // Designing Data-Intensive Applications
        const pastBook2 = createdBooks[3]; // Dune

        const order = await this.orderRepo.save(
          this.orderRepo.create({
            orderNumber: `ORD-${Date.now().toString().slice(-6)}-9281`,
            userId: user.id,
            addressId: address1.id,
            totalAmount: Number(pastBook1.price) + Number(pastBook2.price),
            discountAmount: 0,
            pointsRedeemed: 0,
            finalAmount: Number(pastBook1.price) + Number(pastBook2.price),
            paymentMethod: 'CREDIT_CARD',
            status: OrderStatus.COMPLETED,
          }),
        );

        await this.orderItemRepo.save([
          this.orderItemRepo.create({
            orderId: order.id,
            bookId: pastBook1.id,
            quantity: 1,
            unitPrice: pastBook1.price,
            totalPrice: pastBook1.price,
          }),
          this.orderItemRepo.create({
            orderId: order.id,
            bookId: pastBook2.id,
            quantity: 1,
            unitPrice: pastBook2.price,
            totalPrice: pastBook2.price,
          }),
        ]);
      }
    }

    this.logger.log(`Database seeded successfully! Loaded ${createdBooks.length} books, ${seedCategories.length} categories, ${seedBrands.length} brands.`);
  }
}
