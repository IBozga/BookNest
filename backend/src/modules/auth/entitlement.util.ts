import { UserRole } from '../../entities';

/** Premium titles are visible to premium members and admins only. */
export function canViewPremium(role?: UserRole | string | null): boolean {
  return role === UserRole.PREMIUM || role === UserRole.ADMIN;
}
