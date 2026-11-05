import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { InternalTokenGuard } from '../../internal-auth/internal-token.guard.js';
import type { CatalogQueryDeps } from '../application/catalog-queries.js';
import {
  getCatalogBook,
  listCatalogPublishers,
  searchCatalogBooks,
} from '../application/catalog-queries.js';
import { CATALOG_QUERY_DEPS } from '../catalog.tokens.js';
import type { BookDto, BookPageDto, CatalogFacetsDto } from './book-dto.js';
import { toBookDto } from './book-dto.js';
import { CatalogUnavailableFilter } from './catalog-unavailable.filter.js';
import { parseIsbnParam, parseSearchParams } from './search-params.js';

/** Customer catalog, read by the web server (internal token required). */
@Controller('catalog')
@UseGuards(InternalTokenGuard)
@UseFilters(CatalogUnavailableFilter)
export class CatalogController {
  constructor(
    @Inject(CATALOG_QUERY_DEPS) private readonly deps: CatalogQueryDeps,
  ) {}

  @Get('books')
  async search(@Query() query: Record<string, unknown>): Promise<BookPageDto> {
    const page = await searchCatalogBooks(this.deps, parseSearchParams(query));
    return { items: page.items.map(toBookDto), total: page.total };
  }

  @Get('books/:isbn')
  async findOne(@Param('isbn') isbn: string): Promise<BookDto> {
    const book = await getCatalogBook(this.deps, parseIsbnParam(isbn));
    if (!book) {
      throw new NotFoundException({
        statusCode: 404,
        error: 'book_not_found',
        message: `No sellable book with ISBN ${isbn}`,
      });
    }
    return toBookDto(book);
  }

  @Get('facets')
  async facets(): Promise<CatalogFacetsDto> {
    return { publishers: await listCatalogPublishers(this.deps.books) };
  }
}
