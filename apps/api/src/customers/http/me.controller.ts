import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentCustomer } from '../../customer-auth/current-customer.decorator.js';
import { CustomerTokenGuard } from '../../customer-auth/customer-token.guard.js';
import { InternalTokenGuard } from '../../internal-auth/internal-token.guard.js';
import type { Customer, CustomerStatus } from '../domain/customer.js';

/** Public shape of the signed-in customer. */
export interface MeDto {
  id: string;
  email: string;
  businessName: string;
  taxId: string | null;
  phone: string | null;
  status: CustomerStatus;
}

export function toMeDto(customer: Customer): MeDto {
  return {
    id: customer.id,
    email: customer.email,
    businessName: customer.businessName,
    taxId: customer.taxId,
    phone: customer.phone,
    status: customer.status,
  };
}

/** The customer behind the request (internal token + X-Customer-Token). */
@Controller('me')
@UseGuards(InternalTokenGuard, CustomerTokenGuard)
export class MeController {
  @Get()
  me(@CurrentCustomer() customer: Customer): MeDto {
    return toMeDto(customer);
  }
}
