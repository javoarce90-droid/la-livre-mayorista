import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAccessTokenVerifier } from '../customer-auth/access-token-verifier.js';
import {
  ACCESS_TOKEN_VERIFIER,
  CUSTOMER_REPOSITORY,
} from '../customer-auth/customer-auth.tokens.js';
import { CustomerTokenGuard } from '../customer-auth/customer-token.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MeController } from './http/me.controller.js';
import { PrismaCustomerRepository } from './prisma/prisma-customer-repository.js';

@Module({
  controllers: [MeController],
  providers: [
    {
      provide: CUSTOMER_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaCustomerRepository(prisma),
    },
    {
      provide: ACCESS_TOKEN_VERIFIER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createAccessTokenVerifier(config.get<string>('SUPABASE_URL')),
    },
    CustomerTokenGuard,
  ],
  exports: [CUSTOMER_REPOSITORY, ACCESS_TOKEN_VERIFIER, CustomerTokenGuard],
})
export class CustomersModule {}
