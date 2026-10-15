import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sign } from 'jsonwebtoken';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TokenService } from './token.service';

const SECRET = 'unit-test-secret-that-is-at-least-32-characters-long';

const makeConfig = (values: Record<string, unknown>) =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

describe('TokenService', () => {
  it('refuses to start without a strong JWT_SECRET', () => {
    expect(() => new TokenService(makeConfig({}))).toThrow(/JWT_SECRET/);
    expect(() => new TokenService(makeConfig({ JWT_SECRET: 'too-short' }))).toThrow(/JWT_SECRET/);
  });

  it('signs a token that verifies back to the same user id', () => {
    const service = new TokenService(makeConfig({ JWT_SECRET: SECRET }));
    expect(service.verifyAccessToken(service.signAccessToken('user-1'))).toBe('user-1');
  });
});

describe('JwtAuthGuard', () => {
  const tokenService = new TokenService(makeConfig({ JWT_SECRET: SECRET }));
  const guard = new JwtAuthGuard(tokenService);

  const contextFor = (authorization?: string) => {
    const request: any = { headers: authorization ? { authorization } : {} };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  };

  it('accepts a valid Bearer token and exposes the user id on the request', () => {
    const { context, request } = contextFor(`Bearer ${tokenService.signAccessToken('user-1')}`);

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toEqual({ userId: 'user-1' });
  });

  it('rejects a request with no Authorization header', () => {
    const { context } = contextFor();
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a non-Bearer scheme', () => {
    const { context } = contextFor(`Basic ${tokenService.signAccessToken('user-1')}`);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a tampered token', () => {
    const { context } = contextFor(`Bearer ${tokenService.signAccessToken('user-1')}x`);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a token signed with a different secret', () => {
    const forged = sign({ sub: 'user-1' }, 'another-secret-that-is-also-32-characters-long!', {
      expiresIn: 60,
    });
    const { context } = contextFor(`Bearer ${forged}`);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects an expired token', () => {
    const expired = sign({ sub: 'user-1' }, SECRET, { expiresIn: -10 });
    const { context } = contextFor(`Bearer ${expired}`);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a token signed with a non-HS256 algorithm', () => {
    const hs512 = sign({ sub: 'user-1' }, SECRET, { algorithm: 'HS512', expiresIn: 60 });
    const { context } = contextFor(`Bearer ${hs512}`);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects an unsigned (alg=none) token', () => {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const unsigned = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: 'user-1' })}.`;
    const { context } = contextFor(`Bearer ${unsigned}`);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejects a validly signed token that has no subject', () => {
    const noSub = sign({ foo: 'bar' }, SECRET, { expiresIn: 60 });
    const { context } = contextFor(`Bearer ${noSub}`);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
