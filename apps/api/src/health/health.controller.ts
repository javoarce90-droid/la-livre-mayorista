import { Controller, Get } from '@nestjs/common';

export interface HealthStatus {
  status: 'ok';
}

/**
 * Process-level liveness check. Intentionally independent of the database.
 */
@Controller('health')
export class HealthController {
  @Get()
  check(): HealthStatus {
    return { status: 'ok' };
  }
}
