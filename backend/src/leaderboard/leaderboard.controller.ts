import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import {
  LeaderboardQueryDto,
  LeaderboardResponseDto,
  UserRankResponseDto,
  CompetitiveLeaderboardResponseDto,
  CompetitiveStatsDto,
  LeaderboardPeriod,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// User type from JWT payload
interface JwtUser {
  userId: string;
  username?: string;
}

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
    @CurrentUser() user?: JwtUser,
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
    @CurrentUser() user: JwtUser,
  ): Promise<UserRankResponseDto | null> {
    return this.leaderboardService.getUserRank(
      user.userId,
      query.difficulty,
      query.period,
    );
  }

  // ============ Competitive Leaderboard Endpoints ============

  @Get('competitive')
  @ApiOperation({
    summary: 'Get competitive ELO leaderboard',
    description:
      'Get top players ranked by ELO rating. Only includes users who have played at least 1 competitive match.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of entries to return (default: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Competitive leaderboard retrieved successfully',
    type: CompetitiveLeaderboardResponseDto,
  })
  async getCompetitiveLeaderboard(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @CurrentUser() user?: JwtUser,
  ): Promise<CompetitiveLeaderboardResponseDto> {
    // Clamp limit to reasonable bounds
    const clampedLimit = Math.min(Math.max(1, limit), 100);
    return this.leaderboardService.getCompetitiveLeaderboard(
      clampedLimit,
      user?.userId,
    );
  }

  @Get('competitive/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user competitive stats',
    description:
      "Get the authenticated user's competitive rating, wins, losses, and rank",
  })
  @ApiResponse({
    status: 200,
    description: 'User competitive stats retrieved successfully',
    type: CompetitiveStatsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getMyCompetitiveStats(
    @CurrentUser() user: JwtUser,
  ): Promise<CompetitiveStatsDto | null> {
    return this.leaderboardService.getCompetitiveStats(user.userId);
  }

  // ============ Tripod Leaderboard Endpoints ============

  @Get('tripod')
  @ApiOperation({
    summary: 'Get tripod puzzle leaderboard',
    description:
      'Get top players ranked by best completion time for tripod puzzles. Filters by mode and time period.',
  })
  @ApiQuery({
    name: 'mode',
    required: false,
    enum: ['full', 'borders_only', 'sudoku_only'],
    description: 'Game mode filter (default: full)',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['daily', 'weekly', 'monthly', 'all_time'],
    description: 'Time period filter (default: all_time)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of entries to return (default: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tripod leaderboard retrieved successfully',
  })
  getTripodLeaderboard(
    @Query('mode') mode?: string,
    @Query('period') period?: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @CurrentUser() user?: JwtUser,
  ) {
    const resolvedMode = mode || 'full';
    const clampedLimit = Math.min(Math.max(1, limit ?? 50), 100);

    // Map string to LeaderboardPeriod enum
    const periodMap: Record<string, LeaderboardPeriod> = {
      daily: LeaderboardPeriod.DAILY,
      weekly: LeaderboardPeriod.WEEKLY,
      monthly: LeaderboardPeriod.MONTHLY,
      all_time: LeaderboardPeriod.ALL_TIME,
    };
    const resolvedPeriod =
      periodMap[period || 'all_time'] ?? LeaderboardPeriod.ALL_TIME;

    return this.leaderboardService.getTripodLeaderboard(
      resolvedMode,
      resolvedPeriod,
      clampedLimit,
      user?.userId,
    );
  }
}
