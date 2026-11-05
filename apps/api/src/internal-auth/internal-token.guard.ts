import { createHash, timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Shared-secret protection for routes meant for the web server only:
 * `Authorization: Bearer <API_INTERNAL_TOKEN>`.
 *
 * When API_INTERNAL_TOKEN is unset, development allows every request (with a
 * single warning) and production fails closed with 503.
 */
@Injectable()
export class InternalTokenGuard implements CanActivate {
  private readonly logger = new Logger(InternalTokenGuard.name);
  private readonly expected: Buffer | null;
  private readonly production: boolean;
  private warned = false;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const token = config.get<string>('API_INTERNAL_TOKEN');
    this.expected = token ? digest(`Bearer ${token}`) : null;
    this.production = config.get<string>('NODE_ENV') === 'production';
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.expected) return this.allowWithoutToken();

    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();
    const header = request.headers.authorization ?? '';
    // Comparing digests keeps the comparison constant-time and length-safe.
    if (!timingSafeEqual(digest(header), this.expected)) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'unauthorized',
        message: 'Missing or invalid internal token',
      });
    }
    return true;
  }

  private allowWithoutToken(): boolean {
    if (this.production) {
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'internal_token_missing',
        message: 'API_INTERNAL_TOKEN is not configured',
      });
    }
    if (!this.warned) {
      this.warned = true;
      this.logger.warn(
        'API_INTERNAL_TOKEN is not set: internal routes are open (development only).',
      );
    }
    return true;
  }
}
