import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecommendationService } from './recommendation.service';
import { Order, OrderItem, Book } from '../../entities';
import { UserService } from '../user/user.service';

describe('RecommendationService', () => {
  let service: RecommendationService;
  let orderRepo: any;
  let orderItemRepo: any;
  let bookRepo: any;
  let userService: any;

  const mockUser = {
    id: 'user-1',
    name: 'Alex Johnson',
  };

  const mockBook: Book = {
    id: 'book-1',
    title: 'Clean Architecture',
    author: 'Robert C. Martin',
    isbn: '978-0134494166',
    price: 34.99,
    stockQuantity: 10,
    isAvailable: true,
    rating: 4.8,
    numReviews: 120,
    format: 'eBook',
    categoryId: 'cat-1',
    brandId: 'brand-1',
  } as any;

  const mockBook2: Book = {
    id: 'book-2',
    title: 'Refactoring',
    author: 'Martin Fowler',
    isbn: '978-0134757599',
    price: 39.99,
    stockQuantity: 8,
    isAvailable: true,
    rating: 4.9,
    numReviews: 200,
    format: 'eBook',
    categoryId: 'cat-1',
    brandId: 'brand-1',
  } as any;

  beforeEach(async () => {
    orderRepo = {
      find: jest.fn(),
    };
    orderItemRepo = {};
    userService = {
      getUserById: jest.fn().mockResolvedValue(mockUser),
      getDefaultUser: jest.fn().mockResolvedValue(mockUser),
    };

    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockBook2]),
    };

    bookRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: orderItemRepo },
        { provide: getRepositoryToken(Book), useValue: bookRepo },
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
  });

  it('returns recommendations based on user order history', async () => {
    orderRepo.find.mockResolvedValue([
      {
        id: 'ord-1',
        userId: 'user-1',
        items: [
          {
            id: 'item-1',
            book: mockBook,
          },
        ],
      },
    ]);

    const result = await service.getRecommendationsBasedOnOrderHistory('user-1', 1);
    expect(result).toEqual([mockBook2]);
    expect(orderRepo.find).toHaveBeenCalled();
  });

  it('handles user with no orders and uses fallback books', async () => {
    orderRepo.find.mockResolvedValue([]);

    const result = await service.getRecommendationsBasedOnOrderHistory(undefined, 1);
    expect(result.length).toBeGreaterThan(0);
    expect(userService.getDefaultUser).toHaveBeenCalled();
  });
});
