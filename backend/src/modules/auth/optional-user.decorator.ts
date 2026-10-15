import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from './jwt-auth.guard';

/** Resolves the caller's user id when OptionalJwtAuthGuard authenticated them; undefined for anonymous visitors. */
export const OptionalUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string | undefined => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user?.userId;
});
