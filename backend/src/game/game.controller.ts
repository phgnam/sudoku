import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { GameService } from './services/game.service';
import {
  CreateGameDto,
  MakeMoveDto,
  UpdateTimeDto,
  ApplyHintDto,
  DashboardStatsResponseDto,
  GameResponseDto,
  MoveResponseDto,
  HintResponseDto,
} from './dto/game.dto';
import {
  CreateTripodGameDto,
  UpdateBordersDto,
  ToggleBorderDto,
  TripodValidationResponseDto,
} from './dto/tripod.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('games')
@Controller('games')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class GameController {
  constructor(private gameService: GameService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get dashboard stats',
    description: 'Get comprehensive game statistics for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
    type: DashboardStatsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getDashboardStats(@CurrentUser() user: any) {
    return this.gameService.getDashboardStats(user.userId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create new game',
    description: 'Create a new Sudoku game with the specified difficulty',
  })
  @ApiBody({ type: CreateGameDto })
  @ApiResponse({
    status: 201,
    description: 'Game created successfully',
    type: GameResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async createGame(
    @Body() createGameDto: CreateGameDto,
    @CurrentUser() user: any,
  ) {
    return this.gameService.createGame(
      user.userId,
      createGameDto.difficulty,
      createGameDto.gameMode || 'classic',
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get game by ID',
    description: 'Retrieve a specific game by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Game ID',
    example: 'game-uuid-12345',
  })
  @ApiResponse({
    status: 200,
    description: 'Game retrieved successfully',
    type: GameResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Game not found',
  })
  async getGame(@Param('id') id: string) {
    return this.gameService.getGame(id);
  }

  @Patch(':id/move')
  @ApiOperation({
    summary: 'Make a move',
    description: 'Place a number in a cell or clear it (value=0)',
  })
  @ApiParam({
    name: 'id',
    description: 'Game ID',
    example: 'game-uuid-12345',
  })
  @ApiBody({ type: MakeMoveDto })
  @ApiResponse({
    status: 200,
    description: 'Move processed successfully',
    type: MoveResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid move or game already completed',
  })
  @ApiResponse({
    status: 404,
    description: 'Game not found',
  })
  async makeMove(@Param('id') id: string, @Body() makeMoveDto: MakeMoveDto) {
    return this.gameService.makeMove(
      id,
      makeMoveDto.row,
      makeMoveDto.col,
      makeMoveDto.value,
    );
  }

  @Post(':id/undo')
  @ApiOperation({
    summary: 'Undo last move',
    description: 'Undo the last move made in the game',
  })
  @ApiParam({
    name: 'id',
    description: 'Game ID',
    example: 'game-uuid-12345',
  })
  @ApiResponse({
    status: 200,
    description: 'Move undone successfully',
    type: GameResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'No moves to undo',
  })
  @ApiResponse({
    status: 404,
    description: 'Game not found',
  })
  async undoMove(@Param('id') id: string) {
    return this.gameService.undoMove(id);
  }

  @Post(':id/hint')
  @ApiOperation({
    summary: 'Get a hint',
    description: 'Get a hint for the next move. Limited to 3 hints per game.',
  })
  @ApiParam({
    name: 'id',
    description: 'Game ID',
    example: 'game-uuid-12345',
  })
  @ApiResponse({
    status: 200,
    description: 'Hint generated successfully',
    type: HintResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'No hints remaining or game completed',
  })
  @ApiResponse({
    status: 404,
    description: 'Game not found',
  })
  async useHint(@Param('id') id: string) {
    return this.gameService.useHint(id);
  }

  @Post(':id/hint/apply')
  @ApiOperation({
    summary: 'Apply hint value',
    description: 'Apply the hint value to the specified cell',
  })
  @ApiParam({
    name: 'id',
    description: 'Game ID',
    example: 'game-uuid-12345',
  })
  @ApiBody({ type: ApplyHintDto })
  @ApiResponse({
    status: 200,
    description: 'Hint applied successfully',
    type: GameResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid hint application',
  })
  @ApiResponse({
    status: 404,
    description: 'Game not found',
  })
  async applyHint(@Param('id') id: string, @Body() body: ApplyHintDto) {
    return this.gameService.applyHint(id, body.row, body.col, body.value);
  }

  @Patch(':id/time')
  @ApiOperation({
    summary: 'Update game time',
    description: 'Update the elapsed time for a game',
  })
  @ApiParam({
    name: 'id',
    description: 'Game ID',
    example: 'game-uuid-12345',
  })
  @ApiBody({ type: UpdateTimeDto })
  @ApiResponse({
    status: 200,
    description: 'Time updated successfully',
    type: GameResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Game not found',
  })
  async updateTime(
    @Param('id') id: string,
    @Body() updateTimeDto: UpdateTimeDto,
  ) {
    return this.gameService.updateTime(id, updateTimeDto.timeElapsed);
  }

  // ===================== TRIPOD GAME ENDPOINTS =====================

  @Post('tripod')
  @ApiOperation({
    summary: 'Create tripod game',
    description: 'Create a new Tripod Sudoku game',
  })
  @ApiBody({ type: CreateTripodGameDto })
  @ApiResponse({
    status: 201,
    description: 'Tripod game created successfully',
    type: GameResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async createTripodGame(
    @Body() dto: CreateTripodGameDto,
    @CurrentUser() user: any,
  ) {
    return this.gameService.createTripodGame(user?.userId || 'anonymous', dto);
  }

  @Patch(':id/borders')
  @ApiOperation({
    summary: 'Update borders',
    description: 'Update all borders in a tripod game',
  })
  @ApiParam({
    name: 'id',
    description: 'Game ID',
    example: 'game-uuid-12345',
  })
  @ApiBody({ type: UpdateBordersDto })
  @ApiResponse({
    status: 200,
    description: 'Borders updated successfully',
    type: GameResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Not a tripod game or game not active',
  })
  @ApiResponse({
    status: 404,
    description: 'Game not found',
  })
  async updateBorders(@Param('id') id: string, @Body() dto: UpdateBordersDto) {
    return this.gameService.updateTripodBorders(id, dto.borders);
  }

  @Patch(':id/border')
  @ApiOperation({
    summary: 'Toggle single border',
    description: 'Toggle a single border in a tripod game',
  })
  @ApiParam({
    name: 'id',
    description: 'Game ID',
    example: 'game-uuid-12345',
  })
  @ApiBody({ type: ToggleBorderDto })
  @ApiResponse({
    status: 200,
    description: 'Border toggled successfully',
    type: GameResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Not a tripod game or invalid border position',
  })
  @ApiResponse({
    status: 404,
    description: 'Game not found',
  })
  async toggleBorder(@Param('id') id: string, @Body() dto: ToggleBorderDto) {
    return this.gameService.toggleTripodBorder(id, dto.type, dto.row, dto.col);
  }

  @Post(':id/validate-tripod')
  @ApiOperation({
    summary: 'Validate tripod game',
    description: 'Validate the current state of a tripod game',
  })
  @ApiParam({
    name: 'id',
    description: 'Game ID',
    example: 'game-uuid-12345',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation result returned',
    type: TripodValidationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Not a tripod game',
  })
  @ApiResponse({
    status: 404,
    description: 'Game not found',
  })
  async validateTripod(@Param('id') id: string) {
    return this.gameService.validateTripodGame(id);
  }
}
