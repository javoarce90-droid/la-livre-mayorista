import { Catch, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { CatalogUnavailableError } from '../domain/catalog-errors.js';

/** Unpriceable catalog (no exchange rate / pricing rule) → 503 with a code. */
@Catch(CatalogUnavailableError)
export class CatalogUnavailableFilter implements ExceptionFilter {
  catch(error: CatalogUnavailableError, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(HttpStatus.SERVICE_UNAVAILABLE)
      .json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        error: error.reason,
        message: error.message,
      });
  }
}
