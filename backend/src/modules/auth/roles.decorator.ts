import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../entities';

export const ROLES_KEY = 'roles';

/** Restricts a route to the given roles. Must be combined with JwtAuthGuard and RolesGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
