import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { RecommendationService } from './recommendation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';

@ApiTags('Recommendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get('order-history')
  @ApiOperation({ summary: 'Get recommended books tailored from past order history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecommendationsBasedOnOrderHistory(
    @CurrentUserId() userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.recommendationService.getRecommendationsBasedOnOrderHistory(
      userId,
      limit ? Number(limit) : 4,
    );
  }
}
