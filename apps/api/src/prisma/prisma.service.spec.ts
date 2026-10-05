import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service.js';

describe('PrismaService', () => {
  it('does not throw at construction and skips $connect when DATABASE_URL is absent', async () => {
    const config = new ConfigService({});
    const service = new PrismaService(config);
    const connect = vi.spyOn(service, '$connect');

    await service.onModuleInit();

    expect(connect).not.toHaveBeenCalled();
    await service.onModuleDestroy();
  });

  it('connects on init when DATABASE_URL is present', async () => {
    const config = new ConfigService({
      DATABASE_URL: 'postgresql://user:password@localhost:5432/placeholder',
    });
    const service = new PrismaService(config);
    const connect = vi
      .spyOn(service, '$connect')
      .mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(connect).toHaveBeenCalledOnce();
  });
});
