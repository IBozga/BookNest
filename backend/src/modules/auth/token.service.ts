import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sign, verify } from 'jsonwebtoken';

const DEFAULT_EXPIRY_SECONDS = 3600;
const MIN_SECRET_LENGTH = 32;

/** Signs and verifies short-lived HS256 access tokens. */
@Injectable()
export class TokenService {
  private readonly secret: string;
  private readonly expiresInSeconds: number;

  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret || secret.length < MIN_SECRET_LENGTH) {
      throw new Error(`JWT_SECRET must be set to a random value of at least ${MIN_SECRET_LENGTH} characters`);
    }
    this.secret = secret;
    this.expiresInSeconds = Number(config.get('JWT_EXPIRES_IN_SECONDS')) || DEFAULT_EXPIRY_SECONDS;
  }

  signAccessToken(userId: string): string {
    return sign({ sub: userId }, this.secret, {
      algorithm: 'HS256',
      expiresIn: this.expiresInSeconds,
    });
  }

  /** Returns the user id for a valid token; throws UnauthorizedException otherwise. */
  verifyAccessToken(token: string): string {
    try {
      const payload = verify(token, this.secret, { algorithms: ['HS256'] });
      if (typeof payload === 'string' || typeof payload.sub !== 'string') {
        throw new Error('Malformed token payload');
      }
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Authentication required');
    }
  }
}
