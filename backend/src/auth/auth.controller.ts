import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './services/auth.service';
import {
  RegisterDto,
  LoginDto,
  MigrateUserDto,
  AuthResponseDto,
  AnonymousTokenResponseDto,
  MessageResponseDto,
  UserResponseDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('anonymous')
  @ApiOperation({
    summary: 'Generate anonymous token',
    description: 'Generate a JWT token for anonymous/guest users',
  })
  @ApiResponse({
    status: 201,
    description: 'Anonymous token generated successfully',
    type: AnonymousTokenResponseDto,
  })
  async generateAnonymousToken() {
    return this.authService.generateAnonymousToken();
  }

  @Post('register')
  @ApiOperation({
    summary: 'Register new user',
    description: 'Create a new user account with email, password and username',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or email already exists',
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.username,
    );
  }

  @Post('login')
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user with email and password',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('migrate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Migrate anonymous user',
    description:
      'Migrate game data from anonymous session to registered account',
  })
  @ApiBody({ type: MigrateUserDto })
  @ApiResponse({
    status: 200,
    description: 'Anonymous user migrated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async migrateAnonymousUser(
    @Body() migrateDto: MigrateUserDto,
    @CurrentUser() user: any,
  ) {
    await this.authService.migrateAnonymousUser(
      migrateDto.sessionId,
      user.userId,
    );
    return { message: 'Anonymous user migrated successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Get the currently authenticated user information',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user information',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getCurrentUser(@CurrentUser() user: any) {
    return user;
  }
}
