import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartItem, Book } from '../../entities';
import { UserService } from '../user/user.service';

describe('CartService', () => {
  let service: CartService;
  let mockCartRepo: any;
  let mockBookRepo: any;
  let mockUserService: any;

  beforeEach(async () => {
    mockUserService = {
      getDefaultUser: jest.fn().mockResolvedValue({ id: 'user-1', name: 'Alex Johnson' }),
      getUserById: jest.fn().mockResolvedValue({ id: 'user-1', name: 'Alex Johnson' }),
    };

    mockCartRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'cart-1',
          userId: 'user-1',
          bookId: 'book-1',
          quantity: 2,
          book: { id: 'book-1', title: 'Deep Learning', price: 49.5 },
        },
      ]),
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((item) => Promise.resolve({ id: 'cart-1', ...item })),
      remove: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockBookRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getRepositoryToken(CartItem), useValue: mockCartRepo },
        { provide: getRepositoryToken(Book), useValue: mockBookRepo },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate cart subtotal correctly', async () => {
    const cart = await service.getCart('user-1');
    expect(cart.totalItems).toBe(2);
    expect(cart.subtotal).toBe(99.0);
  });

  it('should reject adding out-of-stock book to cart', async () => {
    mockBookRepo.findOne.mockResolvedValue({
      id: 'book-out',
      title: 'Out of Stock Book',
      isAvailable: false,
      stockQuantity: 0,
    });

    await expect(
      service.addToCart({ bookId: 'book-out', quantity: 1 }, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should add available book to cart', async () => {
    mockBookRepo.findOne.mockResolvedValue({
      id: 'book-1',
      title: 'In Stock Book',
      isAvailable: true,
      stockQuantity: 10,
    });

    mockCartRepo.findOne.mockResolvedValue(null);

    const cart = await service.addToCart({ bookId: 'book-1', quantity: 1 }, 'user-1');
    expect(cart).toBeDefined();
  });
});
