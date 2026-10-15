import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Address } from '../../entities';
import { CreateAddressDto } from '../../common/dto/create-address.dto';
import { UpdateAddressDto } from '../../common/dto/update-address.dto';
import { STORE } from '../store/store.config';
import { round2 } from '../../common/utils/money';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
  ) {}

  async getDefaultUser(): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { email: 'alex.johnson@example.com' },
      relations: ['addresses'],
    });

    if (!user) {
      // Fallback if not seeded yet
      const firstUser = await this.userRepo.findOne({ relations: ['addresses'] });
      if (!firstUser) {
        throw new NotFoundException('No user found');
      }
      return firstUser;
    }

    return user;
  }

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['addresses'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async getAddresses(userId?: string): Promise<Address[]> {
    const user = userId ? await this.getUserById(userId) : await this.getDefaultUser();
    return this.addressRepo.find({
      where: { userId: user.id },
      order: { isDefault: 'DESC', fullName: 'ASC' },
    });
  }

  async createAddress(dto: CreateAddressDto, userId?: string): Promise<Address> {
    const user = userId ? await this.getUserById(userId) : await this.getDefaultUser();

    if (dto.isDefault) {
      await this.addressRepo.update({ userId: user.id }, { isDefault: false });
    }

    const address = this.addressRepo.create({
      ...dto,
      userId: user.id,
    });

    return this.addressRepo.save(address);
  }

  /** Updates one of the user's own addresses; other users' addresses are reported as not found. */
  async updateAddress(id: string, dto: UpdateAddressDto, userId?: string): Promise<Address> {
    const user = userId ? await this.getUserById(userId) : await this.getDefaultUser();

    const address = await this.addressRepo.findOne({ where: { id, userId: user.id } });
    if (!address) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    if (dto.isDefault) {
      await this.addressRepo.update({ userId: user.id }, { isDefault: false });
    }

    // The validation pipe instantiates the DTO with every property present, so unsent fields are undefined.
    const changes = Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined));
    return this.addressRepo.save({ ...address, ...changes });
  }

  /**
   * Mock wallet top-up. Credits STORE.wallet.topUpAmount to the user's wallet;
   * the balance is capped at STORE.wallet.maxBalance.
   */
  async topUpWallet(userId?: string): Promise<{ walletBalance: number; credited: number }> {
    const user = userId ? await this.getUserById(userId) : await this.getDefaultUser();
    const current = round2(Number(user.walletBalance) || 0);

    if (current >= STORE.wallet.maxBalance) {
      throw new BadRequestException('Wallet balance is already at the maximum');
    }

    const credited = round2(Math.min(STORE.wallet.topUpAmount, STORE.wallet.maxBalance - current));
    const newBalance = round2(current + credited);
    await this.userRepo.update(user.id, { walletBalance: newBalance });
    return { walletBalance: newBalance, credited };
  }
}
