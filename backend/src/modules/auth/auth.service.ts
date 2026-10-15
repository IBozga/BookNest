import { randomUUID } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities';
import { LoginDto } from '../../common/dto/login.dto';
import { hashPassword, verifyPassword } from './password.util';
import { TokenService } from './token.service';

// Valid-format hash used to keep response time constant when the email is unknown.
const DUMMY_HASH = `${'00'.repeat(16)}:${'00'.repeat(64)}`;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly tokenService: TokenService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = :email', { email })
      .getOne();

    const valid = await verifyPassword(dto.password, user?.passwordHash || DUMMY_HASH);
    if (!user || !user.passwordHash || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.tokenService.signAccessToken(user.id);
    return { accessToken, user: this.toProfile(user) };
  }

  /** Creates an anonymous guest account (no password, no points) and returns a session token. */
  async createGuestSession() {
    const guest = await this.userRepo.save(
      this.userRepo.create({
        name: 'Guest',
        email: `guest-${randomUUID()}@guest.invalid`,
        isGuest: true,
        rewardPoints: 0,
        passwordHash: null,
      }),
    );
    return { accessToken: this.tokenService.signAccessToken(guest.id), user: this.toProfile(guest) };
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.toProfile(user);
  }

  async setPassword(userId: string, password: string): Promise<void> {
    await this.userRepo.update({ id: userId }, { passwordHash: await hashPassword(password) });
  }

  private toProfile(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      rewardPoints: user.rewardPoints,
      walletBalance: Number(user.walletBalance ?? 0),
      role: user.role ?? 'customer',
      isGuest: !!user.isGuest,
    };
  }
}
