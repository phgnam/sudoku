import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import {
  LeaderboardQueryDto,
  LeaderboardResponseDto,
  UserRankResponseDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Get leaderboard rankings',
    description:
      'Get top players ranked by best completion time. Filters by difficulty and time period. Only shows registered users.',
  })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard retrieved successfully',
    type: LeaderboardResponseDto,
  })
  async getLeaderboard(
    @Query() query: LeaderboardQueryDto,
    @CurrentUser() user?: any,
  ): Promise<LeaderboardResponseDto> {
    return this.leaderboardService.getLeaderboard(query, user?.userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user rank',
    description:
      "Get the authenticated user's rank for the specified difficulty and period",
  })
  @ApiResponse({
    status: 200,
    description: 'User rank retrieved successfully',
    type: UserRankResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'User has no completed games for this difficulty/period',
  })
  async getMyRank(
    @Query() query: LeaderboardQueryDto,
    @CurrentUser() user: any,
  ): Promise<UserRankResponseDto | null> {
    return this.leaderboardService.getUserRank(
      user.userId,
      query.difficulty,
      query.period,
    );
  }
}

