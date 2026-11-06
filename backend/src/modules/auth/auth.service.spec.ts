import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../../entities';
import { hashPassword } from './password.util';
import { TokenService } from './token.service';

describe('AuthService', () => {
  let service: AuthService;
  let tokenService: { signAccessToken: jest.Mock };
  let queryBuilder: any;
  let userRepo: any;
  let storedUser: any;

  beforeEach(async () => {
    storedUser = {
      id: 'user-1',
      name: 'Alex Johnson',
      email: 'alex.johnson@example.com',
      rewardPoints: 500,
      passwordHash: await hashPassword('Valid-Pass-123'),
    };

    queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(storedUser),
    };
    userRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    tokenService = { signAccessToken: jest.fn().mockReturnValue('signed.jwt.token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: TokenService, useValue: tokenService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    it('returns a signed token and a profile without the password hash', async () => {
      const result = await service.login({ email: 'Alex.Johnson@Example.com ', password: 'Valid-Pass-123' });

      expect(tokenService.signAccessToken).toHaveBeenCalledWith('user-1');
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user).toEqual({
        id: 'user-1',
        name: 'Alex Johnson',
        email: 'alex.johnson@example.com',
        rewardPoints: 500,
        walletBalance: 0,
        role: 'customer',
        isGuest: false,
      });
      expect(JSON.stringify(result)).not.toContain('passwordHash');
    });

    it('normalises the email (trim + lowercase) for the lookup', async () => {
      await service.login({ email: '  ALEX.JOHNSON@example.com ', password: 'Valid-Pass-123' });
      expect(queryBuilder.where).toHaveBeenCalledWith('LOWER(user.email) = :email', {
        email: 'alex.johnson@example.com',
      });
    });

    it('rejects a wrong password with a generic error', async () => {
      await expect(
        service.login({ email: 'alex.johnson@example.com', password: 'Wrong-Pass' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
      expect(tokenService.signAccessToken).not.toHaveBeenCalled();
    });

    it('rejects an unknown email with the same generic error (no user enumeration)', async () => {
      queryBuilder.getOne.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nobody@example.com', password: 'Valid-Pass-123' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });

    it('rejects an account that has no password set', async () => {
      queryBuilder.getOne.mockResolvedValue({ ...storedUser, passwordHash: null });
      await expect(
        service.login({ email: 'alex.johnson@example.com', password: 'Valid-Pass-123' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(tokenService.signAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('returns the profile for a valid user id', async () => {
      userRepo.findOne.mockResolvedValue(storedUser);
      await expect(service.getProfile('user-1')).resolves.toEqual({
        id: 'user-1',
        name: 'Alex Johnson',
        email: 'alex.johnson@example.com',
        rewardPoints: 500,
        walletBalance: 0,
        role: 'customer',
        isGuest: false,
      });
    });

    it('exposes the wallet balance and role of a premium member', async () => {
      userRepo.findOne.mockResolvedValue({ ...storedUser, walletBalance: '25.00', role: 'premium' });
      const profile = await service.getProfile('user-1');
      expect(profile.walletBalance).toBe(25);
      expect(profile.role).toBe('premium');
    });

    it('rejects when the token refers to a user that no longer exists', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.getProfile('gone')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('createGuestSession', () => {
    it('saves a guest user and returns a signed token; the profile has isGuest:true and 0 points', async () => {
      const savedGuest = {
        id: 'guest-1',
        name: 'Guest',
        email: 'guest-uuid@guest.invalid',
        isGuest: true,
        rewardPoints: 0,
      };
      userRepo.save = jest.fn().mockResolvedValue(savedGuest);
      userRepo.create = jest.fn().mockImplementation((d) => d);
      tokenService.signAccessToken.mockReturnValue('guest.token');

      const result = await service.createGuestSession();

      const created = userRepo.create.mock.calls[0][0];
      expect(created.isGuest).toBe(true);
      expect(created.passwordHash).toBeNull();
      expect(created.email).toMatch(/@guest\.invalid$/);
      expect(result.accessToken).toBe('guest.token');
      expect(result.user.isGuest).toBe(true);
      expect(result.user.rewardPoints).toBe(0);
      expect(JSON.stringify(result)).not.toContain('passwordHash');
    });
  });

  describe('setPassword', () => {
    it('stores a hash, never the plaintext password', async () => {
      await service.setPassword('user-1', 'New-Pass-456');
      const [criteria, patch] = userRepo.update.mock.calls[0];
      expect(criteria).toEqual({ id: 'user-1' });
      expect(patch.passwordHash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
      expect(patch.passwordHash).not.toContain('New-Pass-456');
    });
  });
});
