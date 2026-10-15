import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { User, Address } from '../../entities';
import { UpdateAddressDto } from '../../common/dto/update-address.dto';

describe('UserService', () => {
  let service: UserService;
  let userRepo: any;
  let addressRepo: any;

  const mockUser: User = {
    id: 'user-1',
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    rewardPoints: 500,
    addresses: [],
    orders: [],
    createdAt: new Date(),
  } as any;

  const mockAddress: Address = {
    id: 'addr-1',
    userId: 'user-1',
    fullName: 'Alex Johnson',
    street: '123 Main St',
    city: 'Berlin',
    state: 'BE',
    zipCode: '10115',
    country: 'Germany',
    isDefault: true,
    user: mockUser,
  } as any;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };
    addressRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Address), useValue: addressRepo },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('getDefaultUser returns default user by email', async () => {
    userRepo.findOne.mockResolvedValue(mockUser);
    const result = await service.getDefaultUser();
    expect(result).toEqual(mockUser);
  });

  it('getDefaultUser falls back to first user if default email not found', async () => {
    userRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockUser);

    const result = await service.getDefaultUser();
    expect(result).toEqual(mockUser);
  });

  it('getDefaultUser throws NotFoundException if no users found at all', async () => {
    userRepo.findOne.mockResolvedValue(null);
    await expect(service.getDefaultUser()).rejects.toThrow(NotFoundException);
  });

  it('getUserById returns user when found', async () => {
    userRepo.findOne.mockResolvedValue(mockUser);
    const result = await service.getUserById('user-1');
    expect(result).toEqual(mockUser);
  });

  it('getUserById throws NotFoundException when user not found', async () => {
    userRepo.findOne.mockResolvedValue(null);
    await expect(service.getUserById('invalid-id')).rejects.toThrow(NotFoundException);
  });

  it('getAddresses returns user addresses', async () => {
    userRepo.findOne.mockResolvedValue(mockUser);
    addressRepo.find.mockResolvedValue([mockAddress]);

    const result = await service.getAddresses('user-1');
    expect(result).toEqual([mockAddress]);
    expect(addressRepo.find).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      order: { isDefault: 'DESC', fullName: 'ASC' },
    });
  });

  it('createAddress creates and saves address', async () => {
    userRepo.findOne.mockResolvedValue(mockUser);
    addressRepo.create.mockReturnValue(mockAddress);
    addressRepo.save.mockResolvedValue(mockAddress);

    const result = await service.createAddress(
      {
        fullName: 'Alex Johnson',
        street: '123 Main St',
        city: 'Berlin',
        state: 'BE',
        zipCode: '10115',
        country: 'Germany',
        isDefault: true,
      },
      'user-1',
    );

    expect(addressRepo.update).toHaveBeenCalledWith({ userId: 'user-1' }, { isDefault: false });
    expect(result).toEqual(mockAddress);
  });

  describe('UpdateAddressDto validation', () => {
    const errorsFor = (body: object) =>
      validate(plainToInstance(UpdateAddressDto, body, { enableImplicitConversion: true }), {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

    it('accepts a partial update and an empty body', async () => {
      expect(await errorsFor({ city: 'Lyon' })).toHaveLength(0);
      expect(await errorsFor({ isDefault: true })).toHaveLength(0);
      expect(await errorsFor({})).toHaveLength(0);
    });

    it('rejects null and empty values for a field that was sent', async () => {
      expect(await errorsFor({ street: null })).not.toHaveLength(0);
      expect(await errorsFor({ street: '' })).not.toHaveLength(0);
      expect(await errorsFor({ isDefault: null })).not.toHaveLength(0);
    });

    it('rejects values that are too long and unknown properties', async () => {
      expect(await errorsFor({ zipCode: 'x'.repeat(21) })).not.toHaveLength(0);
      expect(await errorsFor({ userId: 'someone-else' })).not.toHaveLength(0);
    });
  });


  describe('updateAddress', () => {
    it('updates only the supplied fields of the user\'s own address', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      addressRepo.findOne.mockResolvedValue({ ...mockAddress });
      addressRepo.save.mockImplementation((a: any) => Promise.resolve(a));

      const result = await service.updateAddress('addr-1', { street: '9 New St', city: 'Munich' }, 'user-1');

      expect(addressRepo.findOne).toHaveBeenCalledWith({ where: { id: 'addr-1', userId: 'user-1' } });
      expect(result).toMatchObject({ id: 'addr-1', street: '9 New St', city: 'Munich', zipCode: '10115', country: 'Germany' });
      expect(addressRepo.update).not.toHaveBeenCalled();
    });

    it('clears the previous default when this address becomes the default', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      addressRepo.findOne.mockResolvedValue({ ...mockAddress, isDefault: false });
      addressRepo.save.mockImplementation((a: any) => Promise.resolve(a));

      const result = await service.updateAddress('addr-1', { isDefault: true }, 'user-1');

      expect(addressRepo.update).toHaveBeenCalledWith({ userId: 'user-1' }, { isDefault: false });
      expect(result.isDefault).toBe(true);
    });

    it('keeps unsent fields when given a DTO built the way the ValidationPipe builds it', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      addressRepo.findOne.mockResolvedValue({ ...mockAddress });
      addressRepo.save.mockImplementation((a: any) => Promise.resolve(a));

      const dto = plainToInstance(UpdateAddressDto, { city: 'Lyon' }, { enableImplicitConversion: true });
      const result = await service.updateAddress('addr-1', dto, 'user-1');

      expect(result).toMatchObject({
        id: 'addr-1',
        userId: 'user-1',
        fullName: 'Alex Johnson',
        street: '123 Main St',
        city: 'Lyon',
        zipCode: '10115',
        country: 'Germany',
        isDefault: true,
      });
      expect(addressRepo.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an address that is not the user\'s', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      addressRepo.findOne.mockResolvedValue(null);

      await expect(service.updateAddress('other-addr', { city: 'X' }, 'user-1')).rejects.toThrow(NotFoundException);
      expect(addressRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('topUpWallet (mock)', () => {
    it('credits the fixed top-up amount', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, walletBalance: '10.00' });

      const result = await service.topUpWallet('user-1');

      expect(result).toEqual({ walletBalance: 35, credited: 25 });
      expect(userRepo.update).toHaveBeenCalledWith('user-1', { walletBalance: 35 });
    });

    it('starts from zero when the user has no balance yet', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser });
      await expect(service.topUpWallet('user-1')).resolves.toEqual({ walletBalance: 25, credited: 25 });
    });

    it('caps the balance at the maximum', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, walletBalance: '490.00' });

      const result = await service.topUpWallet('user-1');

      expect(result).toEqual({ walletBalance: 500, credited: 10 });
    });

    it('rejects a top-up when the wallet is already full', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, walletBalance: '500.00' });

      await expect(service.topUpWallet('user-1')).rejects.toThrow(BadRequestException);
      expect(userRepo.update).not.toHaveBeenCalled();
    });
  });
});
