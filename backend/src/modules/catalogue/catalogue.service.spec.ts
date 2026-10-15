import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CatalogueService } from './catalogue.service';
import { Category, Brand, Book } from '../../entities';
import { UserService } from '../user/user.service';

describe('CatalogueService', () => {
  let service: CatalogueService;
  let mockCategoryRepo: any;
  let mockBrandRepo: any;
  let mockBookRepo: any;
  let mockUserService: any;
  let qb: any;

  beforeEach(async () => {
    mockCategoryRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'cat-1', name: 'Technology & AI', slug: 'technology-ai' },
      ]),
    };

    mockBrandRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 'brand-1', name: "O'Reilly Media", slug: 'oreilly-media' },
      ]),
    };

    qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'book-1',
          title: 'Designing Data-Intensive Applications',
          price: 38.99,
          stockQuantity: 15,
          isAvailable: true,
        },
      ]),
    };

    mockBookRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => qb),
    };

    mockUserService = { getUserById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogueService,
        { provide: getRepositoryToken(Category), useValue: mockCategoryRepo },
        { provide: getRepositoryToken(Brand), useValue: mockBrandRepo },
        { provide: getRepositoryToken(Book), useValue: mockBookRepo },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<CatalogueService>(CatalogueService);
  });

  const premiumFilter = [
    'book.isPremium = :isPremium',
    { isPremium: false },
  ];

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should retrieve all categories', async () => {
    const categories = await service.getCategories();
    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe('Technology & AI');
  });

  it('should retrieve all brands', async () => {
    const brands = await service.getBrands();
    expect(brands).toHaveLength(1);
    expect(brands[0].slug).toBe('oreilly-media');
  });

  it('should query books with filter parameters', async () => {
    const books = await service.getBooks({ categorySlug: 'technology-ai' });
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe('Designing Data-Intensive Applications');
  });

  it('should get single book by id', async () => {
    mockBookRepo.findOne.mockResolvedValue({
      id: 'book-1',
      title: 'Designing Data-Intensive Applications',
      price: 38.99,
    });

    const book = await service.getBookById('book-1');
    expect(book.id).toBe('book-1');
  });

  describe('browse by entitlement', () => {
    it('hides premium titles from anonymous callers', async () => {
      await service.getBooks({});
      expect(qb.andWhere).toHaveBeenCalledWith(...premiumFilter);
      expect(mockUserService.getUserById).not.toHaveBeenCalled();
    });

    it('hides premium titles from a customer', async () => {
      mockUserService.getUserById.mockResolvedValue({ id: 'u1', role: 'customer' });
      await service.getBooks({}, 'u1');
      expect(qb.andWhere).toHaveBeenCalledWith(...premiumFilter);
    });

    it('shows premium titles to a premium member', async () => {
      mockUserService.getUserById.mockResolvedValue({ id: 'u1', role: 'premium' });
      await service.getBooks({}, 'u1');
      expect(qb.andWhere).not.toHaveBeenCalledWith(...premiumFilter);
    });

    it('shows premium titles to an admin', async () => {
      mockUserService.getUserById.mockResolvedValue({ id: 'u1', role: 'admin' });
      await service.getBooks({}, 'u1');
      expect(qb.andWhere).not.toHaveBeenCalledWith(...premiumFilter);
    });

    it('treats an unknown user id as anonymous', async () => {
      mockUserService.getUserById.mockRejectedValue(new NotFoundException());
      await service.getBooks({}, 'ghost');
      expect(qb.andWhere).toHaveBeenCalledWith(...premiumFilter);
    });

    it('reports a premium book as not found to a customer (detail view)', async () => {
      mockBookRepo.findOne.mockResolvedValue({ id: 'p1', isPremium: true });
      mockUserService.getUserById.mockResolvedValue({ id: 'u1', role: 'customer' });
      await expect(service.getBookById('p1', 'u1')).rejects.toThrow(NotFoundException);
      await expect(service.getBookById('p1')).rejects.toThrow(NotFoundException);
    });

    it('returns a premium book to a premium member (detail view)', async () => {
      mockBookRepo.findOne.mockResolvedValue({ id: 'p1', isPremium: true });
      mockUserService.getUserById.mockResolvedValue({ id: 'u1', role: 'premium' });
      await expect(service.getBookById('p1', 'u1')).resolves.toMatchObject({ id: 'p1' });
    });

    it('filters related books by entitlement as well', async () => {
      mockBookRepo.findOne.mockResolvedValue({ id: 'b1', isPremium: false, categoryId: 'cat-1' });
      qb.getMany.mockResolvedValue([{ id: 'b2' }, { id: 'b3' }, { id: 'b4' }, { id: 'b5' }]);
      await service.getRelatedBooks('b1');
      expect(qb.andWhere).toHaveBeenCalledWith(...premiumFilter);
    });
  });

  describe('getUpsellBooks', () => {
    it('suggests pricier available books from the same category, cheapest step first', async () => {
      mockBookRepo.findOne.mockResolvedValue({ id: 'b1', isPremium: false, categoryId: 'cat-1', price: '20.00' });
      qb.getMany.mockResolvedValue([{ id: 'b9', price: 25 }]);

      const result = await service.getUpsellBooks('b1');

      expect(result).toEqual([{ id: 'b9', price: 25 }]);
      expect(qb.andWhere).toHaveBeenCalledWith('book.isAvailable = :isAvailable', { isAvailable: true });
      expect(qb.andWhere).toHaveBeenCalledWith('book.price > :price', { price: 20 });
      expect(qb.andWhere).toHaveBeenCalledWith('book.categoryId = :categoryId', { categoryId: 'cat-1' });
      expect(qb.orderBy).toHaveBeenCalledWith('book.price', 'ASC');
      expect(qb.take).toHaveBeenCalledWith(3);
    });

    it('never suggests premium titles to a customer', async () => {
      mockBookRepo.findOne.mockResolvedValue({ id: 'b1', isPremium: false, categoryId: 'cat-1', price: 20 });
      await service.getUpsellBooks('b1');
      expect(qb.andWhere).toHaveBeenCalledWith(...premiumFilter);
    });

    it('may suggest premium titles to a premium member', async () => {
      mockBookRepo.findOne.mockResolvedValue({ id: 'b1', isPremium: false, categoryId: 'cat-1', price: 20 });
      mockUserService.getUserById.mockResolvedValue({ id: 'u1', role: 'premium' });
      await service.getUpsellBooks('b1', 3, 'u1');
      expect(qb.andWhere).not.toHaveBeenCalledWith(...premiumFilter);
    });

    it('is not found for a book the caller may not see', async () => {
      mockBookRepo.findOne.mockResolvedValue({ id: 'p1', isPremium: true, price: 50 });
      await expect(service.getUpsellBooks('p1')).rejects.toThrow(NotFoundException);
    });
  });
});
