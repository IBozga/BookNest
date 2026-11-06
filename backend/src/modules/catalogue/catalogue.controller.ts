import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { CatalogueService } from './catalogue.service';
import { QueryBooksDto } from '../../common/dto/query-books.dto';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { OptionalUserId } from '../auth/optional-user.decorator';

@ApiTags('Catalogue')
@ApiBearerAuth()
@UseGuards(OptionalJwtAuthGuard)
@Controller()
export class CatalogueController {
  constructor(private readonly catalogueService: CatalogueService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories' })
  async getCategories() {
    return this.catalogueService.getCategories();
  }

  @Get('brands')
  @ApiOperation({ summary: 'Get all brands/publishers' })
  async getBrands() {
    return this.catalogueService.getBrands();
  }

  @Get('books')
  @ApiOperation({ summary: 'Query books catalogue with filtering; premium titles require a premium role' })
  async getBooks(@Query() query: QueryBooksDto, @OptionalUserId() userId?: string) {
    return this.catalogueService.getBooks(query, userId);
  }

  @Get('books/:id')
  @ApiOperation({ summary: 'Get single book details' })
  async getBookById(@Param('id') id: string, @OptionalUserId() userId?: string) {
    return this.catalogueService.getBookById(id, userId);
  }

  @Get('books/:id/related')
  @ApiOperation({ summary: 'Cross-sell: get related books based on category or publisher' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRelatedBooks(
    @Param('id') id: string,
    @Query('limit') limit?: number,
    @OptionalUserId() userId?: string,
  ) {
    return this.catalogueService.getRelatedBooks(id, limit ? Number(limit) : 4, userId);
  }

  @Get('books/:id/upsell')
  @ApiOperation({ summary: 'Up-sell: get pricier alternatives in the same category' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUpsellBooks(
    @Param('id') id: string,
    @Query('limit') limit?: number,
    @OptionalUserId() userId?: string,
  ) {
    return this.catalogueService.getUpsellBooks(id, limit ? Number(limit) : 3, userId);
  }
}
