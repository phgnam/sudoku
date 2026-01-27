import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'password123',
    minLength: 6,
  })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Username (minimum 2 characters)',
    example: 'johndoe',
    minLength: 2,
  })
  @IsNotEmpty()
  @MinLength(2)
  username: string;
}

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
  })
  @IsNotEmpty()
  password: string;
}

export class MigrateUserDto {
  @ApiProperty({
    description: 'Anonymous session ID to migrate',
    example: 'session-uuid-12345',
  })
  @IsNotEmpty()
  sessionId: string;
}

// Response DTOs
export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'User information',
    example: {
      id: 'user-uuid',
      email: 'user@example.com',
      username: 'johndoe',
    },
  })
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export class AnonymousTokenResponseDto {
  @ApiProperty({
    description: 'JWT access token for anonymous user',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Session ID for anonymous user',
    example: 'anon-session-uuid',
  })
  sessionId: string;
}

export class MessageResponseDto {
  @ApiProperty({
    description: 'Response message',
    example: 'Operation completed successfully',
  })
  message: string;
}

export class UserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: 'user-uuid-12345',
  })
  userId: string;

  @ApiProperty({
    description: 'User email (null for anonymous users)',
    example: 'user@example.com',
    nullable: true,
  })
  email: string | null;

  @ApiProperty({
    description: 'Username (null for anonymous users)',
    example: 'johndoe',
    nullable: true,
  })
  username: string | null;

  @ApiProperty({
    description: 'Whether user is anonymous',
    example: false,
  })
  isAnonymous: boolean;
}
