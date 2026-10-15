import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from './jwt-auth.guard';
import { TokenService } from './token.service';

/**
 * Identifies the caller when a valid Bearer token is present but never rejects the request.
 * Used on public endpoints whose result depends on the caller's entitlement (e.g. premium titles).
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = (request.headers.authorization || '').split(' ');

    if (scheme === 'Bearer' && token) {
      try {
        request.user = { userId: this.tokenService.verifyAccessToken(token) };
      } catch {
        // An invalid or expired token is treated as an anonymous visitor.
      }
    }
    return true;
  }
}
