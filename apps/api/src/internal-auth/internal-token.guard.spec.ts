import type { ExecutionContext } from '@nestjs/common';
import {
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { InternalTokenGuard } from './internal-token.guard.js';

function config(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function request(authorization?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
    }),
  } as unknown as ExecutionContext;
}

describe('InternalTokenGuard', () => {
  afterEach(() => vi.restoreAllMocks());

  it('allows a request with the right bearer token', () => {
    const guard = new InternalTokenGuard(config({ API_INTERNAL_TOKEN: 's3cret' }));
    expect(guard.canActivate(request('Bearer s3cret'))).toBe(true);
  });

  it.each([undefined, '', 'Bearer', 'Bearer wrong', 's3cret', 'Basic s3cret'])(
    'rejects authorization %o with 401',
    (header) => {
      const guard = new InternalTokenGuard(
        config({ API_INTERNAL_TOKEN: 's3cret' }),
      );
      expect(() => guard.canActivate(request(header))).toThrow(
        UnauthorizedException,
      );
    },
  );

  it('allows everything outside production when no token is configured, warning once', () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const guard = new InternalTokenGuard(config({ NODE_ENV: 'development' }));

    expect(guard.canActivate(request())).toBe(true);
    expect(guard.canActivate(request('Bearer anything'))).toBe(true);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('fails closed with 503 in production when no token is configured', () => {
    const guard = new InternalTokenGuard(config({ NODE_ENV: 'production' }));
    expect(() => guard.canActivate(request('Bearer x'))).toThrow(
      ServiceUnavailableException,
    );
  });
});
