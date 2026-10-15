import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities';
import { AuthenticatedRequest } from './jwt-auth.guard';
import { ROLES_KEY } from './roles.decorator';

/** Enforces @Roles(...) by reading the caller's current role from the database (never from the token). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.userId;
    const user = userId ? await this.userRepo.findOne({ where: { id: userId } }) : null;

    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }
    return true;
  }
}
