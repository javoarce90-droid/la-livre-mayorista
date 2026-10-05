import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

const DEFAULT_PORT = 3001;
const DEFAULT_WEB_ORIGIN = 'http://localhost:3000';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.get<string>('WEB_ORIGIN') ?? DEFAULT_WEB_ORIGIN,
  });
  app.enableShutdownHooks();

  await app.listen(Number(config.get<string>('PORT') ?? DEFAULT_PORT));
}

await bootstrap();
